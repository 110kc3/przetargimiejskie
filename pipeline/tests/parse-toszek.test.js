import test from 'node:test';
import assert from 'node:assert/strict';
import toszek from '../src/cities/toszek/index.js';

test('Toszek adapter initializes with valid configuration', () => {
  assert.equal(toszek.id, 'toszek');
  assert.equal(toszek.teryt, '2405074');
  assert.equal(toszek.label, 'Toszek');
  assert.equal(toszek.voivodeship, 'slaskie');
  assert.equal(typeof toszek.crawlActive, 'function');
  assert.equal(typeof toszek.crawlResults, 'function');
});
