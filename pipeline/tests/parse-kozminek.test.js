import test from 'node:test';
import assert from 'node:assert/strict';
import kozminek from '../src/cities/kozminek/index.js';

test('Koźminek adapter initializes with valid configuration', () => {
  assert.equal(kozminek.id, 'kozminek');
  assert.equal(kozminek.teryt, '3007054');
  assert.equal(kozminek.label, 'Koźminek');
  assert.equal(kozminek.voivodeship, 'wielkopolskie');
  assert.equal(typeof kozminek.crawlActive, 'function');
  assert.equal(typeof kozminek.crawlResults, 'function');
});
