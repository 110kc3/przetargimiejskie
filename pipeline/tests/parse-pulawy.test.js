import test from 'node:test';
import assert from 'node:assert/strict';
import pulawy from '../src/cities/pulawy/index.js';

test('Puławy adapter initializes with valid configuration', () => {
  assert.equal(pulawy.id, 'pulawy');
  assert.equal(pulawy.teryt, '0614011');
  assert.equal(pulawy.label, 'Puławy');
  assert.equal(pulawy.voivodeship, 'lubelskie');
  assert.equal(typeof pulawy.crawlActive, 'function');
  assert.equal(typeof pulawy.crawlResults, 'function');
});
