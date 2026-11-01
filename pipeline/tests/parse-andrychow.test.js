import test from 'node:test';
import assert from 'node:assert/strict';
import andrychow from '../src/cities/andrychow/index.js';

test('Andrychów adapter initializes with valid configuration', () => {
  assert.equal(andrychow.id, 'andrychow');
  assert.equal(andrychow.teryt, '1218014');
  assert.equal(andrychow.label, 'Andrychów');
  assert.equal(andrychow.voivodeship, 'malopolskie');
  assert.equal(typeof andrychow.crawlActive, 'function');
  assert.equal(typeof andrychow.crawlResults, 'function');
});
