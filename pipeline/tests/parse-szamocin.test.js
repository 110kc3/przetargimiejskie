import test from 'node:test';
import assert from 'node:assert/strict';
import szamocin from '../src/cities/szamocin/index.js';

test('Szamocin adapter initializes with valid configuration', () => {
  assert.equal(szamocin.id, 'szamocin');
  assert.equal(szamocin.teryt, '3001054');
  assert.equal(szamocin.label, 'Szamocin');
  assert.equal(szamocin.voivodeship, 'wielkopolskie');
  assert.equal(typeof szamocin.crawlActive, 'function');
  assert.equal(typeof szamocin.crawlResults, 'function');
});
