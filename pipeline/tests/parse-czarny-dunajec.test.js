import test from 'node:test';
import assert from 'node:assert/strict';
import czarnyDunajec from '../src/cities/czarny-dunajec/index.js';

test('Czarny Dunajec adapter initializes with valid configuration', () => {
  assert.equal(czarnyDunajec.id, 'czarny-dunajec');
  assert.equal(czarnyDunajec.teryt, '1211034');
  assert.equal(czarnyDunajec.label, 'Czarny Dunajec');
  assert.equal(czarnyDunajec.voivodeship, 'malopolskie');
  assert.equal(typeof czarnyDunajec.crawlActive, 'function');
  assert.equal(typeof czarnyDunajec.crawlResults, 'function');
});
