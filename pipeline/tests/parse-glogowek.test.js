import test from 'node:test';
import assert from 'node:assert/strict';
import glogowek from '../src/cities/glogowek/index.js';

test('Głogówek adapter initializes with valid configuration', () => {
  assert.equal(glogowek.id, 'glogowek');
  assert.equal(glogowek.teryt, '1610024');
  assert.equal(glogowek.label, 'Głogówek');
  assert.equal(glogowek.voivodeship, 'opolskie');
  assert.equal(typeof glogowek.crawlActive, 'function');
  assert.equal(typeof glogowek.crawlResults, 'function');
});
