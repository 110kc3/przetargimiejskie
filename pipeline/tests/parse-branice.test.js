import test from 'node:test';
import assert from 'node:assert/strict';
import branice from '../src/cities/branice/index.js';

test('Branice adapter initializes with valid configuration', () => {
  assert.equal(branice.id, 'branice');
  assert.equal(branice.teryt, '1602024');
  assert.equal(branice.label, 'Branice');
  assert.equal(branice.voivodeship, 'opolskie');
  assert.equal(typeof branice.crawlActive, 'function');
  assert.equal(typeof branice.crawlResults, 'function');
});
