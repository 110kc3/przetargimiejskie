import test from 'node:test';
import assert from 'node:assert/strict';
import kowal from '../src/cities/kowal/index.js';

test('Kowal adapter initializes with valid configuration', () => {
  assert.equal(kowal.id, 'kowal');
  assert.equal(kowal.teryt, '0418011');
  assert.equal(kowal.label, 'Kowal');
  assert.equal(kowal.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof kowal.crawlActive, 'function');
  assert.equal(typeof kowal.crawlResults, 'function');
});
