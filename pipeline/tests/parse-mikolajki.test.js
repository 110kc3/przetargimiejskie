import test from 'node:test';
import assert from 'node:assert/strict';
import mikolajki from '../src/cities/mikolajki/index.js';

test('Mikołajki adapter initializes with valid configuration', () => {
  assert.equal(mikolajki.id, 'mikolajki');
  assert.equal(mikolajki.teryt, '2810024');
  assert.equal(mikolajki.label, 'Mikołajki');
  assert.equal(mikolajki.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof mikolajki.crawlActive, 'function');
  assert.equal(typeof mikolajki.crawlResults, 'function');
});
