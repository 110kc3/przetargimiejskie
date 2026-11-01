import test from 'node:test';
import assert from 'node:assert/strict';
import otmuchow from '../src/cities/otmuchow/index.js';

test('Otmuchów adapter initializes with valid configuration', () => {
  assert.equal(otmuchow.id, 'otmuchow');
  assert.equal(otmuchow.teryt, '1607064');
  assert.equal(otmuchow.label, 'Otmuchów');
  assert.equal(otmuchow.voivodeship, 'opolskie');
  assert.equal(typeof otmuchow.crawlActive, 'function');
  assert.equal(typeof otmuchow.crawlResults, 'function');
});
