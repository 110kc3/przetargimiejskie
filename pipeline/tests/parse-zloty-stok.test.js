import test from 'node:test';
import assert from 'node:assert/strict';
import zlotyStok from '../src/cities/zloty-stok/index.js';

test('Złoty Stok adapter initializes with valid configuration', () => {
  assert.equal(zlotyStok.id, 'zloty-stok');
  assert.equal(zlotyStok.teryt, '0224074');
  assert.equal(zlotyStok.label, 'Złoty Stok');
  assert.equal(zlotyStok.voivodeship, 'dolnoslaskie');
  assert.equal(typeof zlotyStok.crawlActive, 'function');
  assert.equal(typeof zlotyStok.crawlResults, 'function');
});
