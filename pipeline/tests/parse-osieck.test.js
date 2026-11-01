import test from 'node:test';
import assert from 'node:assert/strict';
import osieck from '../src/cities/osieck/index.js';

test('Osieck adapter initializes with valid configuration', () => {
  assert.equal(osieck.id, 'osieck');
  assert.equal(osieck.teryt, '1417064');
  assert.equal(osieck.label, 'Osieck');
  assert.equal(osieck.voivodeship, 'mazowieckie');
  assert.equal(typeof osieck.crawlActive, 'function');
  assert.equal(typeof osieck.crawlResults, 'function');
});
