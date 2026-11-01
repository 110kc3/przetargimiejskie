import test from 'node:test';
import assert from 'node:assert/strict';
import zator from '../src/cities/zator/index.js';

test('Zator adapter initializes with valid configuration', () => {
  assert.equal(zator.id, 'zator');
  assert.equal(zator.teryt, '1213094');
  assert.equal(zator.label, 'Zator');
  assert.equal(zator.voivodeship, 'malopolskie');
  assert.equal(typeof zator.crawlActive, 'function');
  assert.equal(typeof zator.crawlResults, 'function');
});
