import test from 'node:test';
import assert from 'node:assert/strict';
import bytow from '../src/cities/bytow/index.js';

test('Bytów adapter initializes with valid configuration', () => {
  assert.equal(bytow.id, 'bytow');
  assert.equal(bytow.teryt, '2201024');
  assert.equal(bytow.label, 'Bytów');
  assert.equal(bytow.voivodeship, 'pomorskie');
  assert.equal(typeof bytow.crawlActive, 'function');
  assert.equal(typeof bytow.crawlResults, 'function');
});
