import test from 'node:test';
import assert from 'node:assert/strict';
import jutrosin from '../src/cities/jutrosin/index.js';

test('Jutrosin adapter initializes with valid configuration', () => {
  assert.equal(jutrosin.id, 'jutrosin');
  assert.equal(jutrosin.teryt, '3022024');
  assert.equal(jutrosin.label, 'Jutrosin');
  assert.equal(jutrosin.voivodeship, 'wielkopolskie');
  assert.equal(typeof jutrosin.crawlActive, 'function');
  assert.equal(typeof jutrosin.crawlResults, 'function');
});
