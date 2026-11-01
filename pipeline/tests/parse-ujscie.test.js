import test from 'node:test';
import assert from 'node:assert/strict';
import ujscie from '../src/cities/ujscie/index.js';

test('Ujście adapter initializes with valid configuration', () => {
  assert.equal(ujscie.id, 'ujscie');
  assert.equal(ujscie.teryt, '3019074');
  assert.equal(ujscie.label, 'Ujście');
  assert.equal(ujscie.voivodeship, 'wielkopolskie');
  assert.equal(typeof ujscie.crawlActive, 'function');
  assert.equal(typeof ujscie.crawlResults, 'function');
});
