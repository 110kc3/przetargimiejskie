import test from 'node:test';
import assert from 'node:assert/strict';
import frampol from '../src/cities/frampol/index.js';

test('Frampol adapter initializes with valid configuration', () => {
  assert.equal(frampol.id, 'frampol');
  assert.equal(frampol.teryt, '0602054');
  assert.equal(frampol.label, 'Frampol');
  assert.equal(frampol.voivodeship, 'lubelskie');
  assert.equal(typeof frampol.crawlActive, 'function');
  assert.equal(typeof frampol.crawlResults, 'function');
});
