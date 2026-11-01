import test from 'node:test';
import assert from 'node:assert/strict';
import libiaz from '../src/cities/libiaz/index.js';

test('Libiąż adapter initializes with valid configuration', () => {
  assert.equal(libiaz.id, 'libiaz');
  assert.equal(libiaz.teryt, '1203044');
  assert.equal(libiaz.label, 'Libiąż');
  assert.equal(libiaz.voivodeship, 'malopolskie');
  assert.equal(typeof libiaz.crawlActive, 'function');
  assert.equal(typeof libiaz.crawlResults, 'function');
});
