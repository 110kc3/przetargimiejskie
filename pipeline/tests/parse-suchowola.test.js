import test from 'node:test';
import assert from 'node:assert/strict';
import suchowola from '../src/cities/suchowola/index.js';

test('Suchowola adapter initializes with valid configuration', () => {
  assert.equal(suchowola.id, 'suchowola');
  assert.equal(suchowola.teryt, '2011094');
  assert.equal(suchowola.label, 'Suchowola');
  assert.equal(suchowola.voivodeship, 'podlaskie');
  assert.equal(typeof suchowola.crawlActive, 'function');
  assert.equal(typeof suchowola.crawlResults, 'function');
});
