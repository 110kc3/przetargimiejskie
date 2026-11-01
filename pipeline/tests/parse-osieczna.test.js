import test from 'node:test';
import assert from 'node:assert/strict';
import osieczna from '../src/cities/osieczna/index.js';

test('Osieczna adapter initializes with valid configuration', () => {
  assert.equal(osieczna.id, 'osieczna');
  assert.equal(osieczna.teryt, '3013034');
  assert.equal(osieczna.label, 'Osieczna');
  assert.equal(osieczna.voivodeship, 'wielkopolskie');
  assert.equal(typeof osieczna.crawlActive, 'function');
  assert.equal(typeof osieczna.crawlResults, 'function');
});
