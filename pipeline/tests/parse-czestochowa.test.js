import test from 'node:test';
import assert from 'node:assert/strict';
import czestochowa from '../src/cities/czestochowa/index.js';

test('Częstochowa adapter initializes with valid configuration', () => {
  assert.equal(czestochowa.id, 'czestochowa');
  assert.equal(czestochowa.teryt, '2464011');
  assert.equal(czestochowa.label, 'Częstochowa');
  assert.equal(czestochowa.voivodeship, 'slaskie');
  assert.equal(typeof czestochowa.crawlActive, 'function');
  assert.equal(typeof czestochowa.crawlResults, 'function');
});
