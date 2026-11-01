import test from 'node:test';
import assert from 'node:assert/strict';
import krajenka from '../src/cities/krajenka/index.js';

test('Krajenka adapter initializes with valid configuration', () => {
  assert.equal(krajenka.id, 'krajenka');
  assert.equal(krajenka.teryt, '3031034');
  assert.equal(krajenka.label, 'Krajenka');
  assert.equal(krajenka.voivodeship, 'wielkopolskie');
  assert.equal(typeof krajenka.crawlActive, 'function');
  assert.equal(typeof krajenka.crawlResults, 'function');
});
