import test from 'node:test';
import assert from 'node:assert/strict';
import knyszyn from '../src/cities/knyszyn/index.js';

test('Knyszyn adapter initializes with valid configuration', () => {
  assert.equal(knyszyn.id, 'knyszyn');
  assert.equal(knyszyn.teryt, '2008044');
  assert.equal(knyszyn.label, 'Knyszyn');
  assert.equal(knyszyn.voivodeship, 'podlaskie');
  assert.equal(typeof knyszyn.crawlActive, 'function');
  assert.equal(typeof knyszyn.crawlResults, 'function');
});
