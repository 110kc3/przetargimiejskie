import test from 'node:test';
import assert from 'node:assert/strict';
import czarnaBialostocka from '../src/cities/czarna-bialostocka/index.js';

test('Czarna Białostocka adapter initializes with valid configuration', () => {
  assert.equal(czarnaBialostocka.id, 'czarna-bialostocka');
  assert.equal(czarnaBialostocka.teryt, '2002024');
  assert.equal(czarnaBialostocka.label, 'Czarna Białostocka');
  assert.equal(czarnaBialostocka.voivodeship, 'podlaskie');
  assert.equal(typeof czarnaBialostocka.crawlActive, 'function');
  assert.equal(typeof czarnaBialostocka.crawlResults, 'function');
});
