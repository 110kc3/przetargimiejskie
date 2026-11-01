import test from 'node:test';
import assert from 'node:assert/strict';
import bircza from '../src/cities/bircza/index.js';

test('Bircza adapter initializes with valid configuration', () => {
  assert.equal(bircza.id, 'bircza');
  assert.equal(bircza.teryt, '1813014');
  assert.equal(bircza.label, 'Bircza');
  assert.equal(bircza.voivodeship, 'podkarpackie');
  assert.equal(typeof bircza.crawlActive, 'function');
  assert.equal(typeof bircza.crawlResults, 'function');
});
