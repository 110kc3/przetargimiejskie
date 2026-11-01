import test from 'node:test';
import assert from 'node:assert/strict';
import milomlyn from '../src/cities/milomlyn/index.js';

test('Miłomłyn adapter initializes with valid configuration', () => {
  assert.equal(milomlyn.id, 'milomlyn');
  assert.equal(milomlyn.teryt, '2815074');
  assert.equal(milomlyn.label, 'Miłomłyn');
  assert.equal(milomlyn.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof milomlyn.crawlActive, 'function');
  assert.equal(typeof milomlyn.crawlResults, 'function');
});
