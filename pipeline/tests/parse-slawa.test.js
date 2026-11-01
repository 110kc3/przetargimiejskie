import test from 'node:test';
import assert from 'node:assert/strict';
import slawa from '../src/cities/slawa/index.js';

test('Sława adapter initializes with valid configuration', () => {
  assert.equal(slawa.id, 'slawa');
  assert.equal(slawa.teryt, '0812014');
  assert.equal(slawa.label, 'Sława');
  assert.equal(slawa.voivodeship, 'lubuskie');
  assert.equal(typeof slawa.crawlActive, 'function');
  assert.equal(typeof slawa.crawlResults, 'function');
});
