import test from 'node:test';
import assert from 'node:assert/strict';
import miastko from '../src/cities/miastko/index.js';

test('Miastko adapter initializes with valid configuration', () => {
  assert.equal(miastko.id, 'miastko');
  assert.equal(miastko.teryt, '2201064');
  assert.equal(miastko.label, 'Miastko');
  assert.equal(miastko.voivodeship, 'pomorskie');
  assert.equal(typeof miastko.crawlActive, 'function');
  assert.equal(typeof miastko.crawlResults, 'function');
});
