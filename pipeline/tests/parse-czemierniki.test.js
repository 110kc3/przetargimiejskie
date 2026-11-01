import test from 'node:test';
import assert from 'node:assert/strict';
import czemierniki from '../src/cities/czemierniki/index.js';

test('Czemierniki adapter initializes with valid configuration', () => {
  assert.equal(czemierniki.id, 'czemierniki');
  assert.equal(czemierniki.teryt, '0615034');
  assert.equal(czemierniki.label, 'Czemierniki');
  assert.equal(czemierniki.voivodeship, 'lubelskie');
  assert.equal(typeof czemierniki.crawlActive, 'function');
  assert.equal(typeof czemierniki.crawlResults, 'function');
});
