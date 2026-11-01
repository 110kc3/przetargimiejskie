import test from 'node:test';
import assert from 'node:assert/strict';
import piaski from '../src/cities/piaski/index.js';

test('Piaski adapter initializes with valid configuration', () => {
  assert.equal(piaski.id, 'piaski');
  assert.equal(piaski.teryt, '0617034');
  assert.equal(piaski.label, 'Piaski');
  assert.equal(piaski.voivodeship, 'lubelskie');
  assert.equal(typeof piaski.crawlActive, 'function');
  assert.equal(typeof piaski.crawlResults, 'function');
});
