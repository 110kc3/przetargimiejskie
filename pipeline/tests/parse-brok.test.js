import test from 'node:test';
import assert from 'node:assert/strict';
import brok from '../src/cities/brok/index.js';

test('Brok adapter initializes with valid configuration', () => {
  assert.equal(brok.id, 'brok');
  assert.equal(brok.teryt, '1416044');
  assert.equal(brok.label, 'Brok');
  assert.equal(brok.voivodeship, 'mazowieckie');
  assert.equal(typeof brok.crawlActive, 'function');
  assert.equal(typeof brok.crawlResults, 'function');
});
