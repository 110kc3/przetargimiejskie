import test from 'node:test';
import assert from 'node:assert/strict';
import susz from '../src/cities/susz/index.js';

test('Susz adapter initializes with valid configuration', () => {
  assert.equal(susz.id, 'susz');
  assert.equal(susz.teryt, '2807064');
  assert.equal(susz.label, 'Susz');
  assert.equal(susz.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof susz.crawlActive, 'function');
  assert.equal(typeof susz.crawlResults, 'function');
});
