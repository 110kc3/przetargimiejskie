import test from 'node:test';
import assert from 'node:assert/strict';
import obrzycko from '../src/cities/obrzycko/index.js';

test('Obrzycko adapter initializes with valid configuration', () => {
  assert.equal(obrzycko.id, 'obrzycko');
  assert.equal(obrzycko.teryt, '3024011');
  assert.equal(obrzycko.label, 'Obrzycko');
  assert.equal(obrzycko.voivodeship, 'wielkopolskie');
  assert.equal(typeof obrzycko.crawlActive, 'function');
  assert.equal(typeof obrzycko.crawlResults, 'function');
});
