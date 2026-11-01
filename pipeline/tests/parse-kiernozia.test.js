import test from 'node:test';
import assert from 'node:assert/strict';
import kiernozia from '../src/cities/kiernozia/index.js';

test('Kiernozia adapter initializes with valid configuration', () => {
  assert.equal(kiernozia.id, 'kiernozia');
  assert.equal(kiernozia.teryt, '1005054');
  assert.equal(kiernozia.label, 'Kiernozia');
  assert.equal(kiernozia.voivodeship, 'lodzkie');
  assert.equal(typeof kiernozia.crawlActive, 'function');
  assert.equal(typeof kiernozia.crawlResults, 'function');
});
