import test from 'node:test';
import assert from 'node:assert/strict';
import karczew from '../src/cities/karczew/index.js';

test('Karczew adapter initializes with valid configuration', () => {
  assert.equal(karczew.id, 'karczew');
  assert.equal(karczew.teryt, '1417044');
  assert.equal(karczew.label, 'Karczew');
  assert.equal(karczew.voivodeship, 'mazowieckie');
  assert.equal(typeof karczew.crawlActive, 'function');
  assert.equal(typeof karczew.crawlResults, 'function');
});
