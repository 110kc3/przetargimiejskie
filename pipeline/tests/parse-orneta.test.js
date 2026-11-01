import test from 'node:test';
import assert from 'node:assert/strict';
import orneta from '../src/cities/orneta/index.js';

test('Orneta adapter initializes with valid configuration', () => {
  assert.equal(orneta.id, 'orneta');
  assert.equal(orneta.teryt, '2809054');
  assert.equal(orneta.label, 'Orneta');
  assert.equal(orneta.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof orneta.crawlActive, 'function');
  assert.equal(typeof orneta.crawlResults, 'function');
});
