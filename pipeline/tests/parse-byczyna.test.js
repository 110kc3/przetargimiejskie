import test from 'node:test';
import assert from 'node:assert/strict';
import byczyna from '../src/cities/byczyna/index.js';

test('Byczyna adapter initializes with valid configuration', () => {
  assert.equal(byczyna.id, 'byczyna');
  assert.equal(byczyna.teryt, '1604014');
  assert.equal(byczyna.label, 'Byczyna');
  assert.equal(byczyna.voivodeship, 'opolskie');
  assert.equal(typeof byczyna.crawlActive, 'function');
  assert.equal(typeof byczyna.crawlResults, 'function');
});
