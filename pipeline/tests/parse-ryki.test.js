import test from 'node:test';
import assert from 'node:assert/strict';
import ryki from '../src/cities/ryki/index.js';

test('Ryki adapter initializes with valid configuration', () => {
  assert.equal(ryki.id, 'ryki');
  assert.equal(ryki.teryt, '0616044');
  assert.equal(ryki.label, 'Ryki');
  assert.equal(ryki.voivodeship, 'lubelskie');
  assert.equal(typeof ryki.crawlActive, 'function');
  assert.equal(typeof ryki.crawlResults, 'function');
});
