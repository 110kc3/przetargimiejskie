import test from 'node:test';
import assert from 'node:assert/strict';
import krzepice from '../src/cities/krzepice/index.js';

test('Krzepice adapter initializes with valid configuration', () => {
  assert.equal(krzepice.id, 'krzepice');
  assert.equal(krzepice.teryt, '2406024');
  assert.equal(krzepice.label, 'Krzepice');
  assert.equal(krzepice.voivodeship, 'slaskie');
  assert.equal(typeof krzepice.crawlActive, 'function');
  assert.equal(typeof krzepice.crawlResults, 'function');
});
