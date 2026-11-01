import test from 'node:test';
import assert from 'node:assert/strict';
import czerwiensk from '../src/cities/czerwiensk/index.js';

test('Czerwieńsk adapter initializes with valid configuration', () => {
  assert.equal(czerwiensk.id, 'czerwiensk');
  assert.equal(czerwiensk.teryt, '0809034');
  assert.equal(czerwiensk.label, 'Czerwieńsk');
  assert.equal(czerwiensk.voivodeship, 'lubuskie');
  assert.equal(typeof czerwiensk.crawlActive, 'function');
  assert.equal(typeof czerwiensk.crawlResults, 'function');
});
