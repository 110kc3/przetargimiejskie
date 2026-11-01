import test from 'node:test';
import assert from 'node:assert/strict';
import tychowo from '../src/cities/tychowo/index.js';

test('Tychowo adapter initializes with valid configuration', () => {
  assert.equal(tychowo.id, 'tychowo');
  assert.equal(tychowo.teryt, '3201044');
  assert.equal(tychowo.label, 'Tychowo');
  assert.equal(tychowo.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof tychowo.crawlActive, 'function');
  assert.equal(typeof tychowo.crawlResults, 'function');
});
