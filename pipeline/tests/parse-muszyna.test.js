import test from 'node:test';
import assert from 'node:assert/strict';
import muszyna from '../src/cities/muszyna/index.js';

test('Muszyna adapter initializes with valid configuration', () => {
  assert.equal(muszyna.id, 'muszyna');
  assert.equal(muszyna.teryt, '1210114');
  assert.equal(muszyna.label, 'Muszyna');
  assert.equal(muszyna.voivodeship, 'malopolskie');
  assert.equal(typeof muszyna.crawlActive, 'function');
  assert.equal(typeof muszyna.crawlResults, 'function');
});
