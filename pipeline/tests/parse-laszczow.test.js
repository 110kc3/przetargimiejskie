import test from 'node:test';
import assert from 'node:assert/strict';
import laszczow from '../src/cities/laszczow/index.js';

test('Łaszczów adapter initializes with valid configuration', () => {
  assert.equal(laszczow.id, 'laszczow');
  assert.equal(laszczow.teryt, '0618064');
  assert.equal(laszczow.label, 'Łaszczów');
  assert.equal(laszczow.voivodeship, 'lubelskie');
  assert.equal(typeof laszczow.crawlActive, 'function');
  assert.equal(typeof laszczow.crawlResults, 'function');
});
