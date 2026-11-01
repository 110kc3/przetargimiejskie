import test from 'node:test';
import assert from 'node:assert/strict';
import tuchow from '../src/cities/tuchow/index.js';

test('Tuchów adapter initializes with valid configuration', () => {
  assert.equal(tuchow.id, 'tuchow');
  assert.equal(tuchow.teryt, '1216104');
  assert.equal(tuchow.label, 'Tuchów');
  assert.equal(tuchow.voivodeship, 'malopolskie');
  assert.equal(typeof tuchow.crawlActive, 'function');
  assert.equal(typeof tuchow.crawlResults, 'function');
});
