import test from 'node:test';
import assert from 'node:assert/strict';

import { operationalFields } from '../src/build-index.js';

test('failed outcome degrades coverage without replacing last successful check', () => {
  const fields = operationalFields({
    outcome: {
      id: 'example', status: 'failed',
      metrics: { attempted_at: '2026-09-08T12:00:00.000Z', duration_ms: 1234, request_count: 7 },
    },
    meta: {
      generated_at: '2026-09-07T12:00:00.000Z',
      last_successful_source_check_at: '2026-09-07T12:00:00.000Z',
    },
    validationStatus: 'enforced',
    assets: ['land'],
  });

  assert.equal(fields.coverage_status, 'degraded');
  assert.equal(fields.last_source_attempt_at, '2026-09-08T12:00:00.000Z');
  assert.equal(fields.last_successful_source_check_at, '2026-09-07T12:00:00.000Z');
  assert.equal(fields.last_refresh_status, 'failed');
  assert.equal(fields.last_refresh_duration_ms, 1234);
  assert.equal(fields.last_refresh_request_count, 7);
});

test('a later ready outcome clears a prior refresh failure', () => {
  const fields = operationalFields({
    outcome: {
      id: 'example', status: 'ready',
      metrics: { attempted_at: '2026-09-09T12:00:00.000Z', duration_ms: 800, request_count: 3 },
    },
    previous: { last_refresh_status: 'failed' },
    meta: { valid_empty: true, last_successful_source_check_at: '2026-09-09T12:00:00.000Z' },
    validationStatus: 'enforced',
  });

  assert.equal(fields.coverage_status, 'valid_empty');
  assert.equal(fields.last_refresh_status, 'ready');
});
