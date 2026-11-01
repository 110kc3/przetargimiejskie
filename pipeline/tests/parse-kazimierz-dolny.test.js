import test from 'node:test';
import assert from 'node:assert/strict';
import kazimierzDolny from '../src/cities/kazimierz-dolny/index.js';

test('Kazimierz Dolny adapter initializes with valid configuration', () => {
  assert.equal(kazimierzDolny.id, 'kazimierz-dolny');
  assert.equal(kazimierzDolny.teryt, '0614044');
  assert.equal(kazimierzDolny.label, 'Kazimierz Dolny');
  assert.equal(kazimierzDolny.voivodeship, 'lubelskie');
  assert.equal(typeof kazimierzDolny.crawlActive, 'function');
  assert.equal(typeof kazimierzDolny.crawlResults, 'function');
});
