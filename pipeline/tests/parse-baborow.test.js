import test from 'node:test';
import assert from 'node:assert/strict';
import baborow from '../src/cities/baborow/index.js';

test('Baborów adapter initializes with valid configuration', () => {
  assert.equal(baborow.id, 'baborow');
  assert.equal(baborow.teryt, '1602014');
  assert.equal(baborow.label, 'Baborów');
  assert.equal(baborow.voivodeship, 'opolskie');
  assert.equal(typeof baborow.crawlActive, 'function');
  assert.equal(typeof baborow.crawlResults, 'function');
});
