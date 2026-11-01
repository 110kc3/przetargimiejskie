import test from 'node:test';
import assert from 'node:assert/strict';
import ciechanowiec from '../src/cities/ciechanowiec/index.js';

test('Ciechanowiec adapter initializes with valid configuration', () => {
  assert.equal(ciechanowiec.id, 'ciechanowiec');
  assert.equal(ciechanowiec.teryt, '2013024');
  assert.equal(ciechanowiec.label, 'Ciechanowiec');
  assert.equal(ciechanowiec.voivodeship, 'podlaskie');
  assert.equal(typeof ciechanowiec.crawlActive, 'function');
  assert.equal(typeof ciechanowiec.crawlResults, 'function');
});
