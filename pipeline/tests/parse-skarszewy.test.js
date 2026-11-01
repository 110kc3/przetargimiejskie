import test from 'node:test';
import assert from 'node:assert/strict';
import skarszewy from '../src/cities/skarszewy/index.js';

test('Skarszewy adapter initializes with valid configuration', () => {
  assert.equal(skarszewy.id, 'skarszewy');
  assert.equal(skarszewy.teryt, '2213094');
  assert.equal(skarszewy.label, 'Skarszewy');
  assert.equal(skarszewy.voivodeship, 'pomorskie');
  assert.equal(typeof skarszewy.crawlActive, 'function');
  assert.equal(typeof skarszewy.crawlResults, 'function');
});
