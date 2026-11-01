import test from 'node:test';
import assert from 'node:assert/strict';
import pelplin from '../src/cities/pelplin/index.js';

test('Pelplin adapter initializes with valid configuration', () => {
  assert.equal(pelplin.id, 'pelplin');
  assert.equal(pelplin.teryt, '2214044');
  assert.equal(pelplin.label, 'Pelplin');
  assert.equal(pelplin.voivodeship, 'pomorskie');
  assert.equal(typeof pelplin.crawlActive, 'function');
  assert.equal(typeof pelplin.crawlResults, 'function');
});
