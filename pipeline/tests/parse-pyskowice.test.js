import test from 'node:test';
import assert from 'node:assert/strict';
import pyskowice from '../src/cities/pyskowice/index.js';

test('Pyskowice adapter initializes with valid configuration', () => {
  assert.equal(pyskowice.id, 'pyskowice');
  assert.equal(pyskowice.teryt, '2405021');
  assert.equal(pyskowice.label, 'Pyskowice');
  assert.equal(pyskowice.voivodeship, 'slaskie');
  assert.equal(typeof pyskowice.crawlActive, 'function');
  assert.equal(typeof pyskowice.crawlResults, 'function');
});
