import test from 'node:test';
import assert from 'node:assert/strict';
import prusice from '../src/cities/prusice/index.js';

test('Prusice adapter initializes with valid configuration', () => {
  assert.equal(prusice.id, 'prusice');
  assert.equal(prusice.teryt, '0220024');
  assert.equal(prusice.label, 'Prusice');
  assert.equal(prusice.voivodeship, 'dolnoslaskie');
  assert.equal(typeof prusice.crawlActive, 'function');
  assert.equal(typeof prusice.crawlResults, 'function');
});
