import test from 'node:test';
import assert from 'node:assert/strict';
import strzelin from '../src/cities/strzelin/index.js';

test('Strzelin adapter initializes with valid configuration', () => {
  assert.equal(strzelin.id, 'strzelin');
  assert.equal(strzelin.teryt, '0217044');
  assert.equal(strzelin.label, 'Strzelin');
  assert.equal(strzelin.voivodeship, 'dolnoslaskie');
  assert.equal(typeof strzelin.crawlActive, 'function');
  assert.equal(typeof strzelin.crawlResults, 'function');
});
