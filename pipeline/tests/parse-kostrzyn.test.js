import test from 'node:test';
import assert from 'node:assert/strict';
import kostrzyn from '../src/cities/kostrzyn/index.js';

test('Kostrzyn adapter initializes with valid configuration', () => {
  assert.equal(kostrzyn.id, 'kostrzyn');
  assert.equal(kostrzyn.teryt, '3021084');
  assert.equal(kostrzyn.label, 'Kostrzyn');
  assert.equal(kostrzyn.voivodeship, 'wielkopolskie');
  assert.equal(typeof kostrzyn.crawlActive, 'function');
  assert.equal(typeof kostrzyn.crawlResults, 'function');
});
