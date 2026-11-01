import test from 'node:test';
import assert from 'node:assert/strict';
import budzyn from '../src/cities/budzyn/index.js';

test('Budzyń adapter initializes with valid configuration', () => {
  assert.equal(budzyn.id, 'budzyn');
  assert.equal(budzyn.teryt, '3001024');
  assert.equal(budzyn.label, 'Budzyń');
  assert.equal(budzyn.voivodeship, 'wielkopolskie');
  assert.equal(typeof budzyn.crawlActive, 'function');
  assert.equal(typeof budzyn.crawlResults, 'function');
});
