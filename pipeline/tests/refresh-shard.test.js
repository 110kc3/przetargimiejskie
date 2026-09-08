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
