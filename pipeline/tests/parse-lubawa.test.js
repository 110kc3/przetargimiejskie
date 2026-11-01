import test from 'node:test';
import assert from 'node:assert/strict';
import lubawa from '../src/cities/lubawa/index.js';

test('Lubawa adapter initializes with valid configuration', () => {
  assert.equal(lubawa.id, 'lubawa');
  assert.equal(lubawa.teryt, '2807021');
  assert.equal(lubawa.label, 'Lubawa');
  assert.equal(lubawa.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof lubawa.crawlActive, 'function');
  assert.equal(typeof lubawa.crawlResults, 'function');
});
