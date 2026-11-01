import test from 'node:test';
import assert from 'node:assert/strict';
import recz from '../src/cities/recz/index.js';

test('Recz adapter initializes with valid configuration', () => {
  assert.equal(recz.id, 'recz');
  assert.equal(recz.teryt, '3202064');
  assert.equal(recz.label, 'Recz');
  assert.equal(recz.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof recz.crawlActive, 'function');
  assert.equal(typeof recz.crawlResults, 'function');
});
