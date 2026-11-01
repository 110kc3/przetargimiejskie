import test from 'node:test';
import assert from 'node:assert/strict';
import zielonka from '../src/cities/zielonka/index.js';

test('Zielonka adapter initializes with valid configuration', () => {
  assert.equal(zielonka.id, 'zielonka');
  assert.equal(zielonka.teryt, '1434041');
  assert.equal(zielonka.label, 'Zielonka');
  assert.equal(zielonka.voivodeship, 'mazowieckie');
  assert.equal(typeof zielonka.crawlActive, 'function');
  assert.equal(typeof zielonka.crawlResults, 'function');
});
