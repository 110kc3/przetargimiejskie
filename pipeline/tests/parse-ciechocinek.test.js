import test from 'node:test';
import assert from 'node:assert/strict';
import ciechocinek from '../src/cities/ciechocinek/index.js';

test('Ciechocinek adapter initializes with valid configuration', () => {
  assert.equal(ciechocinek.id, 'ciechocinek');
  assert.equal(ciechocinek.teryt, '0401021');
  assert.equal(ciechocinek.label, 'Ciechocinek');
  assert.equal(ciechocinek.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof ciechocinek.crawlActive, 'function');
  assert.equal(typeof ciechocinek.crawlResults, 'function');
});
