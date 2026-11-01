import test from 'node:test';
import assert from 'node:assert/strict';
import nowogrod from '../src/cities/nowogrod/index.js';

test('Nowogród adapter initializes with valid configuration', () => {
  assert.equal(nowogrod.id, 'nowogrod');
  assert.equal(nowogrod.teryt, '2007044');
  assert.equal(nowogrod.label, 'Nowogród');
  assert.equal(nowogrod.voivodeship, 'podlaskie');
  assert.equal(typeof nowogrod.crawlActive, 'function');
  assert.equal(typeof nowogrod.crawlResults, 'function');
});
