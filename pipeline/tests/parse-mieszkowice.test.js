import test from 'node:test';
import assert from 'node:assert/strict';
import mieszkowice from '../src/cities/mieszkowice/index.js';

test('Mieszkowice adapter initializes with valid configuration', () => {
  assert.equal(mieszkowice.id, 'mieszkowice');
  assert.equal(mieszkowice.teryt, '3206054');
  assert.equal(mieszkowice.label, 'Mieszkowice');
  assert.equal(mieszkowice.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof mieszkowice.crawlActive, 'function');
  assert.equal(typeof mieszkowice.crawlResults, 'function');
});
