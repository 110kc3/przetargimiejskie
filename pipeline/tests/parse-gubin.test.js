import test from 'node:test';
import assert from 'node:assert/strict';
import gubin from '../src/cities/gubin/index.js';

test('Gubin adapter initializes with valid configuration', () => {
  assert.equal(gubin.id, 'gubin');
  assert.equal(gubin.teryt, '0802011');
  assert.equal(gubin.label, 'Gubin');
  assert.equal(gubin.voivodeship, 'lubuskie');
  assert.equal(typeof gubin.crawlActive, 'function');
  assert.equal(typeof gubin.crawlResults, 'function');
});
