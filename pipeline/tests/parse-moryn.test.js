import test from 'node:test';
import assert from 'node:assert/strict';
import moryn from '../src/cities/moryn/index.js';

test('Moryń adapter initializes with valid configuration', () => {
  assert.equal(moryn.id, 'moryn');
  assert.equal(moryn.teryt, '3206064');
  assert.equal(moryn.label, 'Moryń');
  assert.equal(moryn.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof moryn.crawlActive, 'function');
  assert.equal(typeof moryn.crawlResults, 'function');
});
