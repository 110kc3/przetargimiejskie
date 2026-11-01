import test from 'node:test';
import assert from 'node:assert/strict';
import czerniejewo from '../src/cities/czerniejewo/index.js';

test('Czerniejewo adapter initializes with valid configuration', () => {
  assert.equal(czerniejewo.id, 'czerniejewo');
  assert.equal(czerniejewo.teryt, '3003024');
  assert.equal(czerniejewo.label, 'Czerniejewo');
  assert.equal(czerniejewo.voivodeship, 'wielkopolskie');
  assert.equal(typeof czerniejewo.crawlActive, 'function');
  assert.equal(typeof czerniejewo.crawlResults, 'function');
});
