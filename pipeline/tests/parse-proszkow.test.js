import test from 'node:test';
import assert from 'node:assert/strict';
import proszkow from '../src/cities/proszkow/index.js';

test('Prószków adapter initializes with valid configuration', () => {
  assert.equal(proszkow.id, 'proszkow');
  assert.equal(proszkow.teryt, '1609104');
  assert.equal(proszkow.label, 'Prószków');
  assert.equal(proszkow.voivodeship, 'opolskie');
  assert.equal(typeof proszkow.crawlActive, 'function');
  assert.equal(typeof proszkow.crawlResults, 'function');
});
