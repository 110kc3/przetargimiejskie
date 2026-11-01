import test from 'node:test';
import assert from 'node:assert/strict';
import skwierzyna from '../src/cities/skwierzyna/index.js';

test('Skwierzyna adapter initializes with valid configuration', () => {
  assert.equal(skwierzyna.id, 'skwierzyna');
  assert.equal(skwierzyna.teryt, '0803054');
  assert.equal(skwierzyna.label, 'Skwierzyna');
  assert.equal(skwierzyna.voivodeship, 'lubuskie');
  assert.equal(typeof skwierzyna.crawlActive, 'function');
  assert.equal(typeof skwierzyna.crawlResults, 'function');
});
