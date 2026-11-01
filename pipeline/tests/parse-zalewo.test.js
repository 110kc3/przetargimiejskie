import test from 'node:test';
import assert from 'node:assert/strict';
import zalewo from '../src/cities/zalewo/index.js';

test('Zalewo adapter initializes with valid configuration', () => {
  assert.equal(zalewo.id, 'zalewo');
  assert.equal(zalewo.teryt, '2807074');
  assert.equal(zalewo.label, 'Zalewo');
  assert.equal(zalewo.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof zalewo.crawlActive, 'function');
  assert.equal(typeof zalewo.crawlResults, 'function');
});
