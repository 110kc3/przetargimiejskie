import test from 'node:test';
import assert from 'node:assert/strict';
import lask from '../src/cities/lask/index.js';

test('Łask adapter initializes with valid configuration', () => {
  assert.equal(lask.id, 'lask');
  assert.equal(lask.teryt, '1003024');
  assert.equal(lask.label, 'Łask');
  assert.equal(lask.voivodeship, 'lodzkie');
  assert.equal(typeof lask.crawlActive, 'function');
  assert.equal(typeof lask.crawlResults, 'function');
});
