import test from 'node:test';
import assert from 'node:assert/strict';
import dabie from '../src/cities/dabie/index.js';

test('Dąbie adapter initializes with valid configuration', () => {
  assert.equal(dabie.id, 'dabie');
  assert.equal(dabie.teryt, '3009044');
  assert.equal(dabie.label, 'Dąbie');
  assert.equal(dabie.voivodeship, 'wielkopolskie');
  assert.equal(typeof dabie.crawlActive, 'function');
  assert.equal(typeof dabie.crawlResults, 'function');
});
