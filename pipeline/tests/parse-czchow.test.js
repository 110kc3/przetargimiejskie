import test from 'node:test';
import assert from 'node:assert/strict';
import czchow from '../src/cities/czchow/index.js';

test('Czchów adapter initializes with valid configuration', () => {
  assert.equal(czchow.id, 'czchow');
  assert.equal(czchow.teryt, '1202034');
  assert.equal(czchow.label, 'Czchów');
  assert.equal(czchow.voivodeship, 'malopolskie');
  assert.equal(typeof czchow.crawlActive, 'function');
  assert.equal(typeof czchow.crawlResults, 'function');
});
