import test from 'node:test';
import assert from 'node:assert/strict';
import morag from '../src/cities/morag/index.js';

test('Morąg adapter initializes with valid configuration', () => {
  assert.equal(morag.id, 'morag');
  assert.equal(morag.teryt, '2815084');
  assert.equal(morag.label, 'Morąg');
  assert.equal(morag.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof morag.crawlActive, 'function');
  assert.equal(typeof morag.crawlResults, 'function');
});
