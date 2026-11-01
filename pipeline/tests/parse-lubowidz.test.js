import test from 'node:test';
import assert from 'node:assert/strict';
import lubowidz from '../src/cities/lubowidz/index.js';

test('Lubowidz adapter initializes with valid configuration', () => {
  assert.equal(lubowidz.id, 'lubowidz');
  assert.equal(lubowidz.teryt, '1437034');
  assert.equal(lubowidz.label, 'Lubowidz');
  assert.equal(lubowidz.voivodeship, 'mazowieckie');
  assert.equal(typeof lubowidz.crawlActive, 'function');
  assert.equal(typeof lubowidz.crawlResults, 'function');
});
