import test from 'node:test';
import assert from 'node:assert/strict';
import miedzyzdroje from '../src/cities/miedzyzdroje/index.js';

test('Międzyzdroje adapter initializes with valid configuration', () => {
  assert.equal(miedzyzdroje.id, 'miedzyzdroje');
  assert.equal(miedzyzdroje.teryt, '3207044');
  assert.equal(miedzyzdroje.label, 'Międzyzdroje');
  assert.equal(miedzyzdroje.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof miedzyzdroje.crawlActive, 'function');
  assert.equal(typeof miedzyzdroje.crawlResults, 'function');
});
