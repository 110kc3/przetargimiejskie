import test from 'node:test';
import assert from 'node:assert/strict';
import pasym from '../src/cities/pasym/index.js';

test('Pasym adapter initializes with valid configuration', () => {
  assert.equal(pasym.id, 'pasym');
  assert.equal(pasym.teryt, '2817044');
  assert.equal(pasym.label, 'Pasym');
  assert.equal(pasym.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof pasym.crawlActive, 'function');
  assert.equal(typeof pasym.crawlResults, 'function');
});
