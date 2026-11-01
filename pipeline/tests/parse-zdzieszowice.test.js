import test from 'node:test';
import assert from 'node:assert/strict';
import zdzieszowice from '../src/cities/zdzieszowice/index.js';

test('Zdzieszowice adapter initializes with valid configuration', () => {
  assert.equal(zdzieszowice.id, 'zdzieszowice');
  assert.equal(zdzieszowice.teryt, '1605054');
  assert.equal(zdzieszowice.label, 'Zdzieszowice');
  assert.equal(zdzieszowice.voivodeship, 'opolskie');
  assert.equal(typeof zdzieszowice.crawlActive, 'function');
  assert.equal(typeof zdzieszowice.crawlResults, 'function');
});
