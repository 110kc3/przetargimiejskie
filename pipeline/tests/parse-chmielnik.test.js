import test from 'node:test';
import assert from 'node:assert/strict';
import chmielnik from '../src/cities/chmielnik/index.js';

test('Chmielnik adapter initializes with valid configuration', () => {
  assert.equal(chmielnik.id, 'chmielnik');
  assert.equal(chmielnik.teryt, '2604044');
  assert.equal(chmielnik.label, 'Chmielnik');
  assert.equal(chmielnik.voivodeship, 'swietokrzyskie');
  assert.equal(typeof chmielnik.crawlActive, 'function');
  assert.equal(typeof chmielnik.crawlResults, 'function');
});
