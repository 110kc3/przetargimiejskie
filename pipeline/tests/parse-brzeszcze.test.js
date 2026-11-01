import test from 'node:test';
import assert from 'node:assert/strict';
import brzeszcze from '../src/cities/brzeszcze/index.js';

test('Brzeszcze adapter initializes with valid configuration', () => {
  assert.equal(brzeszcze.id, 'brzeszcze');
  assert.equal(brzeszcze.teryt, '1213024');
  assert.equal(brzeszcze.label, 'Brzeszcze');
  assert.equal(brzeszcze.voivodeship, 'malopolskie');
  assert.equal(typeof brzeszcze.crawlActive, 'function');
  assert.equal(typeof brzeszcze.crawlResults, 'function');
});
