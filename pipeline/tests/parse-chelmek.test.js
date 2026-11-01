import test from 'node:test';
import assert from 'node:assert/strict';
import chelmek from '../src/cities/chelmek/index.js';

test('Chełmek adapter initializes with valid configuration', () => {
  assert.equal(chelmek.id, 'chelmek');
  assert.equal(chelmek.teryt, '1213034');
  assert.equal(chelmek.label, 'Chełmek');
  assert.equal(chelmek.voivodeship, 'malopolskie');
  assert.equal(typeof chelmek.crawlActive, 'function');
  assert.equal(typeof chelmek.crawlResults, 'function');
});
