import test from 'node:test';
import assert from 'node:assert/strict';
import miekinia from '../src/cities/miekinia/index.js';

test('Miękinia adapter initializes with valid configuration', () => {
  assert.equal(miekinia.id, 'miekinia');
  assert.equal(miekinia.teryt, '0218034');
  assert.equal(miekinia.label, 'Miękinia');
  assert.equal(miekinia.voivodeship, 'dolnoslaskie');
  assert.equal(typeof miekinia.crawlActive, 'function');
  assert.equal(typeof miekinia.crawlResults, 'function');
});
