import test from 'node:test';
import assert from 'node:assert/strict';
import bialaczow from '../src/cities/bialaczow/index.js';

test('Białaczów adapter initializes with valid configuration', () => {
  assert.equal(bialaczow.id, 'bialaczow');
  assert.equal(bialaczow.teryt, '1007014');
  assert.equal(bialaczow.label, 'Białaczów');
  assert.equal(bialaczow.voivodeship, 'lodzkie');
  assert.equal(typeof bialaczow.crawlActive, 'function');
  assert.equal(typeof bialaczow.crawlResults, 'function');
});
