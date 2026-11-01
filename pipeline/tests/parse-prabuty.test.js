import test from 'node:test';
import assert from 'node:assert/strict';
import prabuty from '../src/cities/prabuty/index.js';

test('Prabuty adapter initializes with valid configuration', () => {
  assert.equal(prabuty.id, 'prabuty');
  assert.equal(prabuty.teryt, '2207044');
  assert.equal(prabuty.label, 'Prabuty');
  assert.equal(prabuty.voivodeship, 'pomorskie');
  assert.equal(typeof prabuty.crawlActive, 'function');
  assert.equal(typeof prabuty.crawlResults, 'function');
});
