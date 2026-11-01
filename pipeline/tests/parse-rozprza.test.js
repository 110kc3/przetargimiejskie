import test from 'node:test';
import assert from 'node:assert/strict';
import rozprza from '../src/cities/rozprza/index.js';

test('Rozprza adapter initializes with valid configuration', () => {
  assert.equal(rozprza.id, 'rozprza');
  assert.equal(rozprza.teryt, '1010084');
  assert.equal(rozprza.label, 'Rozprza');
  assert.equal(rozprza.voivodeship, 'lodzkie');
  assert.equal(typeof rozprza.crawlActive, 'function');
  assert.equal(typeof rozprza.crawlResults, 'function');
});
