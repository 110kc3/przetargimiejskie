import test from 'node:test';
import assert from 'node:assert/strict';
import sierpc from '../src/cities/sierpc/index.js';

test('Sierpc adapter initializes with valid configuration', () => {
  assert.equal(sierpc.id, 'sierpc');
  assert.equal(sierpc.teryt, '1427011');
  assert.equal(sierpc.label, 'Sierpc');
  assert.equal(sierpc.voivodeship, 'mazowieckie');
  assert.equal(typeof sierpc.crawlActive, 'function');
  assert.equal(typeof sierpc.crawlResults, 'function');
});
