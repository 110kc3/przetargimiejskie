import test from 'node:test';
import assert from 'node:assert/strict';
import dabrowaBialostocka from '../src/cities/dabrowa-bialostocka/index.js';

test('Dąbrowa Białostocka adapter initializes with valid configuration', () => {
  assert.equal(dabrowaBialostocka.id, 'dabrowa-bialostocka');
  assert.equal(dabrowaBialostocka.teryt, '2011014');
  assert.equal(dabrowaBialostocka.label, 'Dąbrowa Białostocka');
  assert.equal(dabrowaBialostocka.voivodeship, 'podlaskie');
  assert.equal(typeof dabrowaBialostocka.crawlActive, 'function');
  assert.equal(typeof dabrowaBialostocka.crawlResults, 'function');
});
