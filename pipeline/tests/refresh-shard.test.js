import test from 'node:test';
import assert from 'node:assert/strict';

import { runSequential } from '../scripts/refresh-shard.js';

test('a failed city does not prevent later cities in a shard from running', async () => {
  const attempted = [];
  const outcomes = await runSequential(['first', 'broken', 'last'], async (city) => {
    attempted.push(city);
    if (city === 'broken') throw new Error('injected city failure');
    return { city, status: 'ready' };
  });

  assert.deepEqual(attempted, ['first', 'broken', 'last']);
  assert.deepEqual(outcomes, [
    { city: 'first', status: 'ready' },
    { city: 'broken', status: 'failed', error: 'injected city failure' },
    { city: 'last', status: 'ready' },
  ]);
});

import { cityBudgetMs, MIN_CITY_BUDGET_MS } from '../scripts/refresh-shard.js';

test('a city receives the full timeout while the shard has ample time', () => {
  assert.equal(cityBudgetMs({ now: 0, deadlineAt: 60 * 60_000, cityTimeoutMs: 20 * 60_000 }), 20 * 60_000);
});

test('a city timeout is clamped to the remaining shard time', () => {
  assert.equal(cityBudgetMs({ now: 0, deadlineAt: 5 * 60_000, cityTimeoutMs: 20 * 60_000 }), 5 * 60_000);
});

test('no city starts when less than the minimum budget remains', () => {
  assert.equal(cityBudgetMs({
    now: 0, deadlineAt: MIN_CITY_BUDGET_MS - 1, cityTimeoutMs: 20 * 60_000,
  }), 0);
});
