import test from 'node:test';
import assert from 'node:assert/strict';
import miroslawiec from '../src/cities/miroslawiec/index.js';

test('Mirosławiec adapter initializes with valid configuration', () => {
  assert.equal(miroslawiec.id, 'miroslawiec');
  assert.equal(miroslawiec.teryt, '3217034');
  assert.equal(miroslawiec.label, 'Mirosławiec');
  assert.equal(miroslawiec.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof miroslawiec.crawlActive, 'function');
  assert.equal(typeof miroslawiec.crawlResults, 'function');
});
