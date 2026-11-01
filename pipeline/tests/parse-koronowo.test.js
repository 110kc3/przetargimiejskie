import test from 'node:test';
import assert from 'node:assert/strict';
import koronowo from '../src/cities/koronowo/index.js';

test('Koronowo adapter initializes with valid configuration', () => {
  assert.equal(koronowo.id, 'koronowo');
  assert.equal(koronowo.teryt, '0403044');
  assert.equal(koronowo.label, 'Koronowo');
  assert.equal(koronowo.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof koronowo.crawlActive, 'function');
  assert.equal(typeof koronowo.crawlResults, 'function');
});
