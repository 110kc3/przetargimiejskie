import test from 'node:test';
import assert from 'node:assert/strict';
import gniew from '../src/cities/gniew/index.js';

test('Gniew adapter initializes with valid configuration', () => {
  assert.equal(gniew.id, 'gniew');
  assert.equal(gniew.teryt, '2214024');
  assert.equal(gniew.label, 'Gniew');
  assert.equal(gniew.voivodeship, 'pomorskie');
  assert.equal(typeof gniew.crawlActive, 'function');
  assert.equal(typeof gniew.crawlResults, 'function');
});
