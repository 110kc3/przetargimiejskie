import test from 'node:test';
import assert from 'node:assert/strict';
import sienno from '../src/cities/sienno/index.js';

test('Sienno adapter initializes with valid configuration', () => {
  assert.equal(sienno.id, 'sienno');
  assert.equal(sienno.teryt, '1409054');
  assert.equal(sienno.label, 'Sienno');
  assert.equal(sienno.voivodeship, 'mazowieckie');
  assert.equal(typeof sienno.crawlActive, 'function');
  assert.equal(typeof sienno.crawlResults, 'function');
});
