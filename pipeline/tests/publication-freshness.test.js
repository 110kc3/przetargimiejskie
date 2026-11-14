import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePublicationFreshness, newestPublicationCommitDate } from '../scripts/publication-freshness.js';

const NOW = Date.parse('2026-10-24T07:00:00Z');

test('a publication from yesterday morning is fresh', () => {
  const result = evaluatePublicationFreshness({
    newestPublicationIso: '2026-10-23T05:00:00Z', now: NOW, maxAgeDays: 2,
  });
  assert.equal(result.ok, true);
});

test('the 21 October publication is flagged stalled by the 24 October health run', () => {
  const result = evaluatePublicationFreshness({
    newestPublicationIso: '2026-10-21T22:13:24Z', now: NOW, maxAgeDays: 2,
  });
  assert.equal(result.ok, false);
  assert.match(result.summary, /stalled/);
  assert.match(result.summary, /2026-10-21T22:13:24Z/);
});

test('a missing publication commit is stalled', () => {
  assert.equal(evaluatePublicationFreshness({ newestPublicationIso: '', now: NOW, maxAgeDays: 2 }).ok, false);
});

test('the newest publication commit is looked up by its commit message pattern', () => {
  const calls = [];
  const date = newestPublicationCommitDate((command, args) => {
    calls.push([command, args]);
    return '2026-10-21T22:13:24+00:00\n';
  });
  assert.equal(date, '2026-10-21T22:13:24+00:00');
  assert.ok(calls[0][1].includes('--grep=^data: refresh cities'));
});
