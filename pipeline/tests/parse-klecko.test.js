import test from 'node:test';
import assert from 'node:assert/strict';
import klecko from '../src/cities/klecko/index.js';

test('Kłecko adapter initializes with valid configuration', () => {
  assert.equal(klecko.id, 'klecko');
  assert.equal(klecko.teryt, '3003054');
  assert.equal(klecko.label, 'Kłecko');
  assert.equal(klecko.voivodeship, 'wielkopolskie');
  assert.equal(typeof klecko.crawlActive, 'function');
  assert.equal(typeof klecko.crawlResults, 'function');
});
