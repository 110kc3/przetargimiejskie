import test from 'node:test';
import assert from 'node:assert/strict';
import lochow from '../src/cities/lochow/index.js';

test('Łochów adapter initializes with valid configuration', () => {
  assert.equal(lochow.id, 'lochow');
  assert.equal(lochow.teryt, '1433054');
  assert.equal(lochow.label, 'Łochów');
  assert.equal(lochow.voivodeship, 'mazowieckie');
  assert.equal(typeof lochow.crawlActive, 'function');
  assert.equal(typeof lochow.crawlResults, 'function');
});
