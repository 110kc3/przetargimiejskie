import test from 'node:test';
import assert from 'node:assert/strict';
import czempin from '../src/cities/czempin/index.js';

test('Czempiń adapter initializes with valid configuration', () => {
  assert.equal(czempin.id, 'czempin');
  assert.equal(czempin.teryt, '3011024');
  assert.equal(czempin.label, 'Czempiń');
  assert.equal(czempin.voivodeship, 'wielkopolskie');
  assert.equal(typeof czempin.crawlActive, 'function');
  assert.equal(typeof czempin.crawlResults, 'function');
});
