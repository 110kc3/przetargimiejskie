import test from 'node:test';
import assert from 'node:assert/strict';
import kornik from '../src/cities/kornik/index.js';

test('Kórnik adapter initializes with valid configuration', () => {
  assert.equal(kornik.id, 'kornik');
  assert.equal(kornik.teryt, '3021094');
  assert.equal(kornik.label, 'Kórnik');
  assert.equal(kornik.voivodeship, 'wielkopolskie');
  assert.equal(typeof kornik.crawlActive, 'function');
  assert.equal(typeof kornik.crawlResults, 'function');
});
