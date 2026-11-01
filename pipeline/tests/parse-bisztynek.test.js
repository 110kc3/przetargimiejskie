import test from 'node:test';
import assert from 'node:assert/strict';
import bisztynek from '../src/cities/bisztynek/index.js';

test('Bisztynek adapter initializes with valid configuration', () => {
  assert.equal(bisztynek.id, 'bisztynek');
  assert.equal(bisztynek.teryt, '2801044');
  assert.equal(bisztynek.label, 'Bisztynek');
  assert.equal(bisztynek.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof bisztynek.crawlActive, 'function');
  assert.equal(typeof bisztynek.crawlResults, 'function');
});
