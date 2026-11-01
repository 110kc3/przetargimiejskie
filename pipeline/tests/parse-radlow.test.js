import test from 'node:test';
import assert from 'node:assert/strict';
import radlow from '../src/cities/radlow/index.js';

test('Radłów adapter initializes with valid configuration', () => {
  assert.equal(radlow.id, 'radlow');
  assert.equal(radlow.teryt, '1216054');
  assert.equal(radlow.label, 'Radłów');
  assert.equal(radlow.voivodeship, 'malopolskie');
  assert.equal(typeof radlow.crawlActive, 'function');
  assert.equal(typeof radlow.crawlResults, 'function');
});
