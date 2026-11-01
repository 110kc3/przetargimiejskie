import test from 'node:test';
import assert from 'node:assert/strict';
import annopol from '../src/cities/annopol/index.js';

test('Annopol adapter initializes with valid configuration', () => {
  assert.equal(annopol.id, 'annopol');
  assert.equal(annopol.teryt, '0607024');
  assert.equal(annopol.label, 'Annopol');
  assert.equal(annopol.voivodeship, 'lubelskie');
  assert.equal(typeof annopol.crawlActive, 'function');
  assert.equal(typeof annopol.crawlResults, 'function');
});
