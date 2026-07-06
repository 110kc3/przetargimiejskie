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
      const city = (args.find((x) => x.startsWith('city:')) || '').replace('city:', '');
      return JSON.stringify(openIssuesByCity[city] || []);
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

test('repeat failure comments instead of duplicating; edits only on changed title', () => {
  const sameTitle = '[city-broken] wejherowo: layout change suspected (0 records parsed)';
  const { run, calls } = fakeGh({ wejherowo: [{ number: 7, title: sameTitle, labels: [] }] });
  let ops = syncIssues(failuresMap('wejherowo'), [], { source: 'refresh', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => o.op), ['comment']);
  assert.ok(!calls.some((c) => c[0] === 'issue' && (c[1] === 'create' || c[1] === 'edit')));

  const gh2 = fakeGh({ wejherowo: [{ number: 7, title: '[city-broken] wejherowo: source unreachable (http 503)', labels: [] }] });
  ops = syncIssues(failuresMap('wejherowo'), [], { source: 'refresh', runUrl: RUN_URL, run: gh2.run });
  assert.deepEqual(ops.map((o) => o.op), ['comment', 'edit']);
});

test('recovered city closes its open issue; failing city is never "recovered"', () => {
  const { run, calls } = fakeGh({ lodz: [{ number: 3, title: 't', labels: [] }] });
  const ops = syncIssues(failuresMap('wejherowo'), ['lodz', 'wejherowo'], { source: 'refresh', runUrl: RUN_URL, run });
  assert.deepEqual(ops.filter((o) => o.op === 'close').map((o) => o.city), ['lodz']);
  const close = calls.find((c) => c[1] === 'close');
  assert.equal(close[2], '3');
});

test('health sync cannot close a refresh-owned issue (anti-flap scope rule)', () => {
  const refreshOwned = { number: 4, title: 't', labels: [{ name: 'city-broken' }] };
  const healthOwned = { number: 5, title: 't', labels: [{ name: 'city-broken' }, { name: 'health-check' }] };
  const { run } = fakeGh({ gdansk: [refreshOwned], lodz: [healthOwned] });
  const ops = syncIssues(new Map(), ['gdansk', 'lodz'], { source: 'health', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => `${o.op}:${o.city}`), ['skip-close:gdansk', 'close:lodz']);
});

test('refresh sync MAY close a health-owned issue (green refresh resolves staleness)', () => {
  const healthOwned = { number: 5, title: 't', labels: [{ name: 'health-check' }] };
  const { run } = fakeGh({ lodz: [healthOwned] });
  const ops = syncIssues(new Map(), ['lodz'], { source: 'refresh', runUrl: RUN_URL, run });
  assert.deepEqual(ops.map((o) => o.op), ['close']);
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
