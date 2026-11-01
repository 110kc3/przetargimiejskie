import test from 'node:test';
import assert from 'node:assert/strict';
import chojna from '../src/cities/chojna/index.js';

test('Chojna adapter initializes with valid configuration', () => {
  assert.equal(chojna.id, 'chojna');
  assert.equal(chojna.teryt, '3206034');
  assert.equal(chojna.label, 'Chojna');
  assert.equal(chojna.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof chojna.crawlActive, 'function');
  assert.equal(typeof chojna.crawlResults, 'function');
});
