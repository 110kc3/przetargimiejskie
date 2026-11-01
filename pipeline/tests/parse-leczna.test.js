import test from 'node:test';
import assert from 'node:assert/strict';
import leczna from '../src/cities/leczna/index.js';

test('Łęczna adapter initializes with valid configuration', () => {
  assert.equal(leczna.id, 'leczna');
  assert.equal(leczna.teryt, '0610034');
  assert.equal(leczna.label, 'Łęczna');
  assert.equal(leczna.voivodeship, 'lubelskie');
  assert.equal(typeof leczna.crawlActive, 'function');
  assert.equal(typeof leczna.crawlResults, 'function');
});
