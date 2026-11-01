import test from 'node:test';
import assert from 'node:assert/strict';
import krobia from '../src/cities/krobia/index.js';

test('Krobia adapter initializes with valid configuration', () => {
  assert.equal(krobia.id, 'krobia');
  assert.equal(krobia.teryt, '3004034');
  assert.equal(krobia.label, 'Krobia');
  assert.equal(krobia.voivodeship, 'wielkopolskie');
  assert.equal(typeof krobia.crawlActive, 'function');
  assert.equal(typeof krobia.crawlResults, 'function');
});
