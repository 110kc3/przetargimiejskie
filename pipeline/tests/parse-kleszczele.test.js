import test from 'node:test';
import assert from 'node:assert/strict';
import kleszczele from '../src/cities/kleszczele/index.js';

test('Kleszczele adapter initializes with valid configuration', () => {
  assert.equal(kleszczele.id, 'kleszczele');
  assert.equal(kleszczele.teryt, '2005074');
  assert.equal(kleszczele.label, 'Kleszczele');
  assert.equal(kleszczele.voivodeship, 'podlaskie');
  assert.equal(typeof kleszczele.crawlActive, 'function');
  assert.equal(typeof kleszczele.crawlResults, 'function');
});
