import test from 'node:test';
import assert from 'node:assert/strict';
import barczewo from '../src/cities/barczewo/index.js';

test('Barczewo adapter initializes with valid configuration', () => {
  assert.equal(barczewo.id, 'barczewo');
  assert.equal(barczewo.teryt, '2814014');
  assert.equal(barczewo.label, 'Barczewo');
  assert.equal(barczewo.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof barczewo.crawlActive, 'function');
  assert.equal(typeof barczewo.crawlResults, 'function');
});
