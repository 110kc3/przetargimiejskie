import test from 'node:test';
import assert from 'node:assert/strict';
import biskupiec from '../src/cities/biskupiec/index.js';

test('Biskupiec adapter initializes with valid configuration', () => {
  assert.equal(biskupiec.id, 'biskupiec');
  assert.equal(biskupiec.teryt, '2814024');
  assert.equal(biskupiec.label, 'Biskupiec');
  assert.equal(biskupiec.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof biskupiec.crawlActive, 'function');
  assert.equal(typeof biskupiec.crawlResults, 'function');
});
