import test from 'node:test';
import assert from 'node:assert/strict';
import starozreby from '../src/cities/starozreby/index.js';

test('Staroźreby adapter initializes with valid configuration', () => {
  assert.equal(starozreby.id, 'starozreby');
  assert.equal(starozreby.teryt, '1419144');
  assert.equal(starozreby.label, 'Staroźreby');
  assert.equal(starozreby.voivodeship, 'mazowieckie');
  assert.equal(typeof starozreby.crawlActive, 'function');
  assert.equal(typeof starozreby.crawlResults, 'function');
});
