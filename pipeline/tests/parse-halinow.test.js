import test from 'node:test';
import assert from 'node:assert/strict';
import halinow from '../src/cities/halinow/index.js';

test('Halinów adapter initializes with valid configuration', () => {
  assert.equal(halinow.id, 'halinow');
  assert.equal(halinow.teryt, '1412074');
  assert.equal(halinow.label, 'Halinów');
  assert.equal(halinow.voivodeship, 'mazowieckie');
  assert.equal(typeof halinow.crawlActive, 'function');
  assert.equal(typeof halinow.crawlResults, 'function');
});
