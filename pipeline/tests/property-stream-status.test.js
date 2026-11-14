import { test } from 'node:test';
import assert from 'node:assert/strict';

import { propertyStreamStatus } from '../src/core/property-stream-status.js';

const base = {
  propertyCrawlEmpty: false, verifiedEmpty: false, crawledRowsAllDiscarded: false,
  previousPropertyCount: 0, prevMeta: null, attemptedAt: '2026-11-14T10:00:00.000Z',
};

test('a crawl whose rows all produce properties is healthy', () => {
  assert.equal(propertyStreamStatus(base).status, 'healthy');
});

test('a crawl whose every row was discarded is degraded, not healthy', () => {
  const status = propertyStreamStatus({
    ...base, crawledRowsAllDiscarded: true,
    prevMeta: { source_checks: { property: { last_success_at: '2026-11-01T00:00:00.000Z' } } },
  });
  assert.equal(status.status, 'degraded');
  assert.equal(status.last_success_at, '2026-11-01T00:00:00.000Z');
});

test('a verified empty source stays verified empty', () => {
  assert.equal(propertyStreamStatus({ ...base, propertyCrawlEmpty: true, verifiedEmpty: true }).status, 'verified_empty');
});

test('an empty crawl with prior data is degraded and without prior data is not monitored', () => {
  assert.equal(propertyStreamStatus({ ...base, propertyCrawlEmpty: true, previousPropertyCount: 3 }).status, 'degraded');
  assert.equal(propertyStreamStatus({ ...base, propertyCrawlEmpty: true }).status, 'not_monitored');
});
