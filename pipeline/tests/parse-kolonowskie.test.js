import test from 'node:test';
import assert from 'node:assert/strict';
import kolonowskie from '../src/cities/kolonowskie/index.js';

test('Kolonowskie adapter initializes with valid configuration', () => {
  assert.equal(kolonowskie.id, 'kolonowskie');
  assert.equal(kolonowskie.teryt, '1611034');
  assert.equal(kolonowskie.label, 'Kolonowskie');
  assert.equal(kolonowskie.voivodeship, 'opolskie');
  assert.equal(typeof kolonowskie.crawlActive, 'function');
  assert.equal(typeof kolonowskie.crawlResults, 'function');
});
