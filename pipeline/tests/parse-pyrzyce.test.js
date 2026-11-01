import test from 'node:test';
import assert from 'node:assert/strict';
import pyrzyce from '../src/cities/pyrzyce/index.js';

test('Pyrzyce adapter initializes with valid configuration', () => {
  assert.equal(pyrzyce.id, 'pyrzyce');
  assert.equal(pyrzyce.teryt, '3212054');
  assert.equal(pyrzyce.label, 'Pyrzyce');
  assert.equal(pyrzyce.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof pyrzyce.crawlActive, 'function');
  assert.equal(typeof pyrzyce.crawlResults, 'function');
});
