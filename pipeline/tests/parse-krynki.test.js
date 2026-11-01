import test from 'node:test';
import assert from 'node:assert/strict';
import krynki from '../src/cities/krynki/index.js';

test('Krynki adapter initializes with valid configuration', () => {
  assert.equal(krynki.id, 'krynki');
  assert.equal(krynki.teryt, '2011044');
  assert.equal(krynki.label, 'Krynki');
  assert.equal(krynki.voivodeship, 'podlaskie');
  assert.equal(typeof krynki.crawlActive, 'function');
  assert.equal(typeof krynki.crawlResults, 'function');
});
