// Unit tests for issue-sync's lifecycle decisions against a fake `gh` runner —
// create vs comment vs edit vs close, and the health-scope anti-flap rule.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncIssues, loadFailures } from '../scripts/issue-sync.js';

const RUN_URL = 'https://github.com/x/y/actions/runs/9';

function fakeGh(openIssuesByCity = {}) {
  const calls = [];
  const run = (args) => {
    calls.push(args);
    if (args[0] === 'issue' && args[1] === 'list') {
      return JSON.stringify(Object.entries(openIssuesByCity).flatMap(([city, issues]) =>
        issues.map((issue) => ({ ...issue, labels: [...(issue.labels || []), { name: `city:${city}` }] }))));
    }
    return '';
  };
  return { run, calls };
}

function failuresMap(...cities) {
  const m = new Map();
  for (const city of cities) {
    m.set(city, {
      failure: {
        city, classification: 'layout-change',
        headline: `layout change suspected (0 records parsed)`,
        evidence: ['empty crawl with no fetch errors'],
      },
      bodyPath: `/tmp/${city}/issue-body.md`,
    });
  }
  return m;
}

test('new failure creates issue with labels', () => {
  const { run, calls } = fakeGh();
  const ops = syncIssues(failuresMap('wejherowo'), [], { source: 'refresh', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => o.op), ['create']);
  const create = calls.find((c) => c[0] === 'issue' && c[1] === 'create');
  assert.ok(create.includes('city-broken') && create.includes('city:wejherowo'));
  assert.match(create[create.indexOf('--title') + 1], /^\[city-broken\] wejherowo:/);
});

test('repeat failure stays quiet; changed failure comments and updates its issue', () => {
  const sameTitle = '[city-broken] wejherowo: layout change suspected (0 records parsed)';
  const { run, calls } = fakeGh({ wejherowo: [{ number: 7, title: sameTitle, labels: [] }] });
  let ops = syncIssues(failuresMap('wejherowo'), [], { source: 'refresh', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => o.op), ['unchanged']);
  assert.ok(!calls.some((c) => c[0] === 'issue' && (c[1] === 'create' || c[1] === 'edit')));

  const gh2 = fakeGh({ wejherowo: [{ number: 7, title: '[city-broken] wejherowo: source unreachable (http 503)', labels: [] }] });
  ops = syncIssues(failuresMap('wejherowo'), [], { source: 'refresh', runUrl: RUN_URL, run: gh2.run });
  assert.deepEqual(ops.map((o) => o.op), ['comment', 'edit']);
});

test('registry-wide stale incident uses one lookup and suppresses age-only repeat writes', () => {
  const issues = {};
  const failures = new Map();
  for (let i = 0; i < 121; i++) {
    const city = `city-${i}`;
    issues[city] = [{ number: i + 1, title: `[city-broken] ${city}: data stale (> 3d) — crawl stopped updating`, labels: [{ name: 'health-check' }] }];
    failures.set(city, { failure: { city, classification: 'stale-data', headline: 'data stale (14.2 days old > 3d) — crawl stopped updating' }, bodyPath: '/tmp/body.md' });
  }
  const { run, calls } = fakeGh(issues);
  const ops = syncIssues(failures, [], { source: 'health', runUrl: RUN_URL, run });
  assert.equal(ops.filter((op) => op.op === 'unchanged').length, 121);
  assert.equal(calls.filter((args) => args[0] === 'issue' && args[1] === 'list').length, 1);
  assert.equal(calls.filter((args) => args[0] === 'issue' && args[1] !== 'list').length, 0);
});

test('legacy stale title migrates once without another failure notification', () => {
  const { run, calls } = fakeGh({ demo: [{ number: 1, title: '[city-broken] demo: data stale (13.2 days old > 3d) — crawl stopped updating', labels: [{ name: 'health-check' }] }] });
  const failures = new Map([['demo', { failure: { headline: 'data stale (14.2 days old > 3d) — crawl stopped updating', classification: 'stale-data' }, bodyPath: '/tmp/body.md' }]]);
  const ops = syncIssues(failures, [], { source: 'health', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((op) => op.op), ['edit']);
  assert.ok(!calls.some((args) => args[1] === 'comment'));
});

test('failed issue inventory cannot cause duplicate issues', () => {
  for (const response of ['not-json', '{}', '']) {
    const calls = [];
    assert.throws(() => syncIssues(failuresMap('demo'), [], {
      source: 'refresh', runUrl: RUN_URL, run: (args) => { calls.push(args); return response; },
    }));
    assert.equal(calls.length, 1);
  }
});

test('recovered city closes its open issue; failing city is never "recovered"', () => {
  const { run, calls } = fakeGh({ lodz: [{ number: 3, title: 't', labels: [] }] });
  const ops = syncIssues(failuresMap('wejherowo'), ['lodz', 'wejherowo', 'lodz'], { source: 'refresh', runUrl: RUN_URL, run });
  assert.deepEqual(ops.filter((o) => o.op === 'close').map((o) => o.city), ['lodz']);
  const close = calls.find((c) => c[1] === 'close');
  assert.equal(close[2], '3');
  assert.equal(calls.filter((c) => c[1] === 'close').length, 1);
});

test('health sync cannot close a refresh-owned issue (anti-flap scope rule)', () => {
  const refreshOwned = { number: 4, title: 't', labels: [{ name: 'city-broken' }] };
  const healthOwned = { number: 5, title: 't', labels: [{ name: 'city-broken' }, { name: 'health-check' }] };
  const { run } = fakeGh({ gdansk: [refreshOwned], lodz: [healthOwned] });
  const ops = syncIssues(new Map(), ['gdansk', 'lodz'], { source: 'health', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => `${o.op}:${o.city}`), ['skip-close:gdansk', 'close:lodz']);
});

test('refresh sync MAY close a health-owned issue once the city has data (unique ≥ 1)', () => {
  const healthOwned = { number: 5, title: 't', labels: [{ name: 'health-check' }] };
  const { run } = fakeGh({ lodz: [healthOwned] });
  const ops = syncIssues(new Map(), ['lodz'],
    { source: 'refresh', runUrl: RUN_URL, run, uniqueForCity: () => 42 });
  assert.deepEqual(ops.map((o) => o.op), ['close']);
});

test('refresh sync SKIPS closing a health-owned issue while the city is still empty (anti-flap)', () => {
  const healthOwned = { number: 5, title: 't', labels: [{ name: 'city-broken' }, { name: 'health-check' }] };
  const { run } = fakeGh({ 'busko-zdroj': [healthOwned] });
  const ops = syncIssues(new Map(), ['busko-zdroj'],
    { source: 'refresh', runUrl: RUN_URL, run, uniqueForCity: () => 0 });
  assert.deepEqual(ops.map((o) => `${o.op}:${o.city}`), ['skip-close:busko-zdroj']);
  // a missing/unreadable meta (null) is treated as still-empty → also skipped
  const gh2 = fakeGh({ 'busko-zdroj': [healthOwned] });
  const ops2 = syncIssues(new Map(), ['busko-zdroj'],
    { source: 'refresh', runUrl: RUN_URL, run: gh2.run, uniqueForCity: () => null });
  assert.deepEqual(ops2.map((o) => o.op), ['skip-close']);
});

test('refresh sync still closes a refresh-owned issue regardless of unique count', () => {
  const refreshOwned = { number: 6, title: 't', labels: [{ name: 'city-broken' }] };
  const { run } = fakeGh({ raciborz: [refreshOwned] });
  const ops = syncIssues(new Map(), ['raciborz'],
    { source: 'refresh', runUrl: RUN_URL, run, uniqueForCity: () => 0 });
  assert.deepEqual(ops.map((o) => o.op), ['close']);
});

test('title ownership: health does NOT re-title a refresh-owned issue (dual-failing churn guard)', () => {
  // refresh-owned issue (no health-check label) with a stale title; health is
  // now also failing the city. Health may comment but must not flip the title.
  const refreshOwned = { number: 9, title: '[city-broken] gdansk: old refresh headline', labels: [{ name: 'city-broken' }] };
  const { run, calls } = fakeGh({ gdansk: [refreshOwned] });
  const ops = syncIssues(failuresMap('gdansk'), [], { source: 'health', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => o.op), ['comment']);
  assert.ok(!calls.some((c) => c[0] === 'issue' && c[1] === 'edit'));
});

test('title ownership: health DOES re-title an issue it owns when the mode changed', () => {
  const healthOwned = { number: 10, title: '[city-broken] gdansk: old health headline', labels: [{ name: 'city-broken' }, { name: 'health-check' }] };
  const { run, calls } = fakeGh({ gdansk: [healthOwned] });
  const ops = syncIssues(failuresMap('gdansk'), [], { source: 'health', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => o.op), ['comment', 'edit']);
  assert.ok(calls.some((c) => c[0] === 'issue' && c[1] === 'edit'));
});

test('loadFailures reads artifact dirs and skips incomplete ones', () => {
  const dir = mkdtempSync(join(tmpdir(), 'triage-'));
  const good = join(dir, 'triage-wejherowo');
  mkdirSync(good);
  writeFileSync(join(good, 'failure.json'), JSON.stringify({ city: 'wejherowo', classification: 'timeout', headline: 'h' }));
  writeFileSync(join(good, 'issue-body.md'), 'body');
  const incomplete = join(dir, 'triage-lodz');
  mkdirSync(incomplete);
  writeFileSync(join(incomplete, 'failure.json'), '{broken');
  const m = loadFailures(dir);
  assert.deepEqual([...m.keys()], ['wejherowo']);
});
