import test from 'node:test';
import assert from 'node:assert/strict';
import golina from '../src/cities/golina/index.js';

test('Golina adapter initializes with valid configuration', () => {
  assert.equal(golina.id, 'golina');
  assert.equal(golina.teryt, '3010014');
  assert.equal(golina.label, 'Golina');
  assert.equal(golina.voivodeship, 'wielkopolskie');
  assert.equal(typeof golina.crawlActive, 'function');
  assert.equal(typeof golina.crawlResults, 'function');
});
