import test from 'node:test';
import assert from 'node:assert/strict';
import goscino from '../src/cities/goscino/index.js';

test('Gościno adapter initializes with valid configuration', () => {
  assert.equal(goscino.id, 'goscino');
  assert.equal(goscino.teryt, '3208034');
  assert.equal(goscino.label, 'Gościno');
  assert.equal(goscino.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof goscino.crawlActive, 'function');
  assert.equal(typeof goscino.crawlResults, 'function');
});
