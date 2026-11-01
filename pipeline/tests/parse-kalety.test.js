import test from 'node:test';
import assert from 'node:assert/strict';
import kalety from '../src/cities/kalety/index.js';

test('Kalety adapter initializes with valid configuration', () => {
  assert.equal(kalety.id, 'kalety');
  assert.equal(kalety.teryt, '2413011');
  assert.equal(kalety.label, 'Kalety');
  assert.equal(kalety.voivodeship, 'slaskie');
  assert.equal(typeof kalety.crawlActive, 'function');
  assert.equal(typeof kalety.crawlResults, 'function');
});
