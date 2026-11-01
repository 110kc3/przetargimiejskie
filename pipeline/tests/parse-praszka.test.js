import test from 'node:test';
import assert from 'node:assert/strict';
import praszka from '../src/cities/praszka/index.js';

test('Praszka adapter initializes with valid configuration', () => {
  assert.equal(praszka.id, 'praszka');
  assert.equal(praszka.teryt, '1608044');
  assert.equal(praszka.label, 'Praszka');
  assert.equal(praszka.voivodeship, 'opolskie');
  assert.equal(typeof praszka.crawlActive, 'function');
  assert.equal(typeof praszka.crawlResults, 'function');
});
