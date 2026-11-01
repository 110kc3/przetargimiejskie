import test from 'node:test';
import assert from 'node:assert/strict';
import bransk from '../src/cities/bransk/index.js';

test('Brańsk adapter initializes with valid configuration', () => {
  assert.equal(bransk.id, 'bransk');
  assert.equal(bransk.teryt, '2003021');
  assert.equal(bransk.label, 'Brańsk');
  assert.equal(bransk.voivodeship, 'podlaskie');
  assert.equal(typeof bransk.crawlActive, 'function');
  assert.equal(typeof bransk.crawlResults, 'function');
});
