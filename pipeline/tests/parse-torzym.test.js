import test from 'node:test';
import assert from 'node:assert/strict';
import torzym from '../src/cities/torzym/index.js';

test('Torzym adapter initializes with valid configuration', () => {
  assert.equal(torzym.id, 'torzym');
  assert.equal(torzym.teryt, '0807054');
  assert.equal(torzym.label, 'Torzym');
  assert.equal(torzym.voivodeship, 'lubuskie');
  assert.equal(typeof torzym.crawlActive, 'function');
  assert.equal(typeof torzym.crawlResults, 'function');
});
