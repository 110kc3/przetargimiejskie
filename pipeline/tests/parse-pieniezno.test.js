import test from 'node:test';
import assert from 'node:assert/strict';
import pieniezno from '../src/cities/pieniezno/index.js';

test('Pieniężno adapter initializes with valid configuration', () => {
  assert.equal(pieniezno.id, 'pieniezno');
  assert.equal(pieniezno.teryt, '2802054');
  assert.equal(pieniezno.label, 'Pieniężno');
  assert.equal(pieniezno.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof pieniezno.crawlActive, 'function');
  assert.equal(typeof pieniezno.crawlResults, 'function');
});
