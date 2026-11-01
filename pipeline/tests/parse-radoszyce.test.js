import test from 'node:test';
import assert from 'node:assert/strict';
import radoszyce from '../src/cities/radoszyce/index.js';

test('Radoszyce adapter initializes with valid configuration', () => {
  assert.equal(radoszyce.id, 'radoszyce');
  assert.equal(radoszyce.teryt, '2605044');
  assert.equal(radoszyce.label, 'Radoszyce');
  assert.equal(radoszyce.voivodeship, 'swietokrzyskie');
  assert.equal(typeof radoszyce.crawlActive, 'function');
  assert.equal(typeof radoszyce.crawlResults, 'function');
});
