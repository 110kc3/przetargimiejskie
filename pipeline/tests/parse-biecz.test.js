import test from 'node:test';
import assert from 'node:assert/strict';
import biecz from '../src/cities/biecz/index.js';

test('Biecz adapter initializes with valid configuration', () => {
  assert.equal(biecz.id, 'biecz');
  assert.equal(biecz.teryt, '1205024');
  assert.equal(biecz.label, 'Biecz');
  assert.equal(biecz.voivodeship, 'malopolskie');
  assert.equal(typeof biecz.crawlActive, 'function');
  assert.equal(typeof biecz.crawlResults, 'function');
});
