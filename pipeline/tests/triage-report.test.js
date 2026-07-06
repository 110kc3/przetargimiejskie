// Unit tests for the triage classifier + issue rendering. Fixture logs mirror
// what refresh.js / sanity-check.js actually print in CI (including the
// machine-readable TRIAGE lines), one per classification branch.

import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCity, renderTitle, renderIssueBody, parseTriageLines } from '../scripts/triage-report.js';

const PREV_META = {
  generated_at: '2026-07-05T04:11:00Z', unique_properties: 41,
  active_auctions: 3, active_listings: 5, wykaz_entries: 2, land_plots: 7,
  parser_version: 3,
};

const green = {
  city: 'wejherowo', refreshOutcome: 'success', sanityOutcome: 'success',
  prevMeta: PREV_META, newMeta: { ...PREV_META, generated_at: '2026-07-06T04:10:00Z' },
  runUrl: 'https://github.com/x/y/actions/runs/1', runId: 1,
};

test('healthy run classifies as null', () => {
  assert.equal(classifyCity({ ...green, refreshLog: 'wejherowo ok\n--- summary ---\n{}' }), null);
});

test('network throw → source-unreachable', () => {
  const log = [
    '  fetch failed (fetch failed) [cause: ETIMEDOUT connect timed out]; retry in 1000ms',
    'TRIAGE {"city":"wejherowo","kind":"throw","message":"http 503 on https://bip.wejherowo.pl/board"}',
    '!!! wejherowo: refresh FAILED (http 503 on https://bip.wejherowo.pl/board) — keeping last-published data, continuing with other cities.',
  ].join('\n');
  const f = classifyCity({ ...green, refreshLog: log });
  assert.equal(f.classification, 'source-unreachable');
  assert.match(renderTitle(f), /^\[city-broken\] wejherowo: source unreachable/);
});

test('non-network throw → adapter-error', () => {
  const log = 'TRIAGE {"city":"wejherowo","kind":"throw","message":"Cannot read properties of undefined (reading \'match\')"}';
  const f = classifyCity({ ...green, refreshLog: log });
  assert.equal(f.classification, 'adapter-error');
});

test('empty crawl without fetch errors → layout-change', () => {
  const log = [
    '  wejherowo: crawl returned EMPTY but 41 properties were previously published — treating as a source outage. Preserving existing data.',
    'TRIAGE {"city":"wejherowo","kind":"empty-crawl","message":"crawl returned empty","prev_properties":41}',
    '--- summary (preserved + aged) ---',
  ].join('\n');
  const f = classifyCity({ ...green, refreshLog: log });
  assert.equal(f.classification, 'layout-change');
  assert.match(f.headline, /41 expected/);
});

test('empty crawl WITH fetch errors → source-unreachable', () => {
  const log = [
    '  fetch failed (http 502 on https://bip.wejherowo.pl/board); retry in 1000ms',
    'TRIAGE {"city":"wejherowo","kind":"empty-crawl","message":"crawl returned empty","prev_properties":41}',
  ].join('\n');
  assert.equal(classifyCity({ ...green, refreshLog: log }).classification, 'source-unreachable');
});

test('sanity failure wins over everything and extracts evidence lines', () => {
  const sanityLog = [
    'katowice: [price-glue] slowackiego|12|3 — starting 180000221400 zł',
    'FAILED — 1 error(s)',
  ].join('\n');
  const f = classifyCity({ ...green, sanityOutcome: 'failure', sanityLog, refreshLog: 'TRIAGE {"city":"wejherowo","kind":"throw","message":"x"}' });
  assert.equal(f.classification, 'sanity-failure');
  assert.ok(f.evidence.some((e) => e.includes('[price-glue]')));
});

test('cancelled or mid-crawl death → timeout', () => {
  assert.equal(classifyCity({ ...green, refreshOutcome: 'cancelled', refreshLog: 'partial' }).classification, 'timeout');
  assert.equal(classifyCity({ ...green, refreshOutcome: 'failure', refreshLog: 'fetching page 3 of' }).classification, 'timeout');
});

test('green run with counts crashed to 0 → layout-change', () => {
  const f = classifyCity({ ...green, refreshLog: '--- summary ---', newMeta: { ...PREV_META, unique_properties: 0 } });
  assert.equal(f.classification, 'layout-change');
});

test('green run with >60% shrink → low-confidence layout-change; small churn stays healthy', () => {
  const f = classifyCity({ ...green, refreshLog: '--- summary ---', newMeta: { ...PREV_META, unique_properties: 10 } });
  assert.equal(f.classification, 'layout-change');
  assert.ok(f.evidence.some((e) => e.includes('LOW CONFIDENCE')));
  assert.equal(classifyCity({ ...green, refreshLog: '--- summary ---', newMeta: { ...PREV_META, unique_properties: 35 } }), null);
});

test('issue body contains the full LLM prompt with paths and commands', () => {
  const f = classifyCity({
    ...green,
    refreshLog: 'TRIAGE {"city":"wejherowo","kind":"empty-crawl","message":"crawl returned empty","prev_properties":41}',
  });
  const body = renderIssueBody(f);
  for (const expected of [
    '<!-- triage-bot city:wejherowo -->',
    'pipeline/src/cities/wejherowo/parse.js',
    'pipeline/tests/parse-wejherowo.test.js',
    'CITY=wejherowo npm run refresh',
    'node --test tests/parse-wejherowo.test.js',
    'triage-wejherowo',
    'Triage prompt (paste into Claude Code)',
  ]) assert.ok(body.includes(expected), `body missing: ${expected}`);
});

test('parseTriageLines skips malformed lines and filters by city', () => {
  const log = 'TRIAGE {broken\nTRIAGE {"city":"a","kind":"throw","message":"m"}\nTRIAGE {"city":"b","kind":"throw","message":"n"}';
  assert.equal(parseTriageLines(log, 'a').length, 1);
  assert.equal(parseTriageLines(log).length, 2);
});

test('health-phase failure renders without artifact instructions', () => {
  const body = renderIssueBody({
    schema: 1, city: 'lodz', classification: 'stale-data', phase: 'health',
    headline: 'data stale (4.2 days > 3d)', run_url: 'u', detected_at: 'now',
    prev_meta: PREV_META, evidence: [], log_tail: '', artifact_name: 'triage-lodz',
  });
  assert.ok(body.includes('health-check finding'));
  assert.ok(!body.includes('contains snapshots/'));
});
