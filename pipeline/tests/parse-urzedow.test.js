import test from 'node:test';
import assert from 'node:assert/strict';
import urzedow from '../src/cities/urzedow/index.js';

test('Urzędów adapter initializes with valid configuration', () => {
  assert.equal(urzedow.id, 'urzedow');
  assert.equal(urzedow.teryt, '0607084');
  assert.equal(urzedow.label, 'Urzędów');
  assert.equal(urzedow.voivodeship, 'lubelskie');
  assert.equal(typeof urzedow.crawlActive, 'function');
  assert.equal(typeof urzedow.crawlResults, 'function');
});
