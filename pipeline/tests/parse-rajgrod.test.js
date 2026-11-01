import test from 'node:test';
import assert from 'node:assert/strict';
import rajgrod from '../src/cities/rajgrod/index.js';

test('Rajgród adapter initializes with valid configuration', () => {
  assert.equal(rajgrod.id, 'rajgrod');
  assert.equal(rajgrod.teryt, '2004044');
  assert.equal(rajgrod.label, 'Rajgród');
  assert.equal(rajgrod.voivodeship, 'podlaskie');
  assert.equal(typeof rajgrod.crawlActive, 'function');
  assert.equal(typeof rajgrod.crawlResults, 'function');
});
