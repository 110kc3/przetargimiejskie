import test from 'node:test';
import assert from 'node:assert/strict';
import zory from '../src/cities/zory/index.js';

test('Żory adapter initializes with valid configuration', () => {
  assert.equal(zory.id, 'zory');
  assert.equal(zory.teryt, '2479011');
  assert.equal(zory.label, 'Żory');
  assert.equal(zory.voivodeship, 'slaskie');
  assert.equal(typeof zory.crawlActive, 'function');
  assert.equal(typeof zory.crawlResults, 'function');
});
