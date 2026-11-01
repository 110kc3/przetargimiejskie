import test from 'node:test';
import assert from 'node:assert/strict';
import brusy from '../src/cities/brusy/index.js';

test('Brusy adapter initializes with valid configuration', () => {
  assert.equal(brusy.id, 'brusy');
  assert.equal(brusy.teryt, '2202024');
  assert.equal(brusy.label, 'Brusy');
  assert.equal(brusy.voivodeship, 'pomorskie');
  assert.equal(typeof brusy.crawlActive, 'function');
  assert.equal(typeof brusy.crawlResults, 'function');
});
