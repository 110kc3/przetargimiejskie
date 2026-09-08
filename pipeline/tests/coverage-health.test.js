import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateCoverageHealth, validateLandDocument } from '../scripts/coverage-health.js';

const now = Date.parse('2026-09-06T12:00:00Z');
const land = {
  schema_version: 1,
  city: 'landowo',
  plots: [{ key: 'dz|centrum|12/3', city: 'landowo', listings: [{ date: '2026-09-20', outcome: 'active' }] }],
};

test('healthy land-only monitoring does not require address-keyed properties', () => {
  const result = evaluateCoverageHealth({
    city: 'landowo', landDocument: land, now,
    meta: {
      unique_properties: 0, land_plots: 1, active_auctions: 1, active_listings: 0,
      last_successful_source_check_at: '2026-09-06T10:00:00Z',
      source_checks: { land: { status: 'healthy' }, property: { status: 'not_monitored' } },
    },
  });
  assert.deepEqual(result.failures, []);
});

test('valid empty requires explicit proof while an unknown empty crawl fails', () => {
  const valid = evaluateCoverageHealth({
    city: 'empty', now,
    meta: { unique_properties: 0, land_plots: 0, valid_empty: true, generated_at: '2026-09-06T10:00:00Z' },
  });
  assert.deepEqual(valid.failures, []);
  const unknown = evaluateCoverageHealth({
    city: 'empty', now,
    meta: { unique_properties: 0, land_plots: 0, valid_empty: false, generated_at: '2026-09-06T10:00:00Z' },
  });
  assert.equal(unknown.failures[0].classification, 'empty-data');
});

test('a degraded stream fails even when another stream has current data', () => {
  const result = evaluateCoverageHealth({
    city: 'landowo', landDocument: land, now,
    meta: {
      unique_properties: 10, land_plots: 1, generated_at: '2026-09-06T10:00:00Z',
      source_checks: { property: { status: 'healthy' }, land: { status: 'degraded' } },
    },
  });
  assert.ok(result.failures.some((failure) => failure.classification === 'source-degraded'));
});

test('a failed outcome is unhealthy even while last-good data remains current', () => {
  const result = evaluateCoverageHealth({
    city: 'example', now,
    indexEntry: {
      last_refresh_status: 'failed',
      last_source_attempt_at: '2026-09-06T11:00:00Z',
    },
    meta: {
      unique_properties: 10, land_plots: 0,
      last_successful_source_check_at: '2026-09-06T10:00:00Z',
    },
  });
  assert.ok(result.failures.some((failure) => failure.classification === 'refresh-failed'));
});

test('land schema validates identity, unique keys and listing history', () => {
  const broken = structuredClone(land);
  broken.plots.push({ key: 'dz|centrum|12/3', city: 'other', listings: [] });
  const failures = validateLandDocument('landowo', broken);
  assert.ok(failures.some((message) => message.includes('duplicate land key')));
  assert.ok(failures.some((message) => message.includes('has city other')));
  assert.ok(failures.some((message) => message.includes('no listing history')));
});
