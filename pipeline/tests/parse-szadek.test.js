import test from 'node:test';
import assert from 'node:assert/strict';
import szadek from '../src/cities/szadek/index.js';

test('Szadek adapter initializes with valid configuration', () => {
  assert.equal(szadek.id, 'szadek');
  assert.equal(szadek.teryt, '1019024');
  assert.equal(szadek.label, 'Szadek');
  assert.equal(szadek.voivodeship, 'lodzkie');
  assert.equal(typeof szadek.crawlActive, 'function');
  assert.equal(typeof szadek.crawlResults, 'function');
});
