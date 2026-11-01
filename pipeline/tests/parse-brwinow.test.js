import test from 'node:test';
import assert from 'node:assert/strict';
import brwinow from '../src/cities/brwinow/index.js';

test('Brwinów adapter initializes with valid configuration', () => {
  assert.equal(brwinow.id, 'brwinow');
  assert.equal(brwinow.teryt, '1421034');
  assert.equal(brwinow.label, 'Brwinów');
  assert.equal(brwinow.voivodeship, 'mazowieckie');
  assert.equal(typeof brwinow.crawlActive, 'function');
  assert.equal(typeof brwinow.crawlResults, 'function');
});
