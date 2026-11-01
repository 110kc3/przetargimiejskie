import test from 'node:test';
import assert from 'node:assert/strict';
import nowogard from '../src/cities/nowogard/index.js';

test('Nowogard adapter initializes with valid configuration', () => {
  assert.equal(nowogard.id, 'nowogard');
  assert.equal(nowogard.teryt, '3204044');
  assert.equal(nowogard.label, 'Nowogard');
  assert.equal(nowogard.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof nowogard.crawlActive, 'function');
  assert.equal(typeof nowogard.crawlResults, 'function');
});
