import test from 'node:test';
import assert from 'node:assert/strict';
import barcin from '../src/cities/barcin/index.js';

test('Barcin adapter initializes with valid configuration', () => {
  assert.equal(barcin.id, 'barcin');
  assert.equal(barcin.teryt, '0419014');
  assert.equal(barcin.label, 'Barcin');
  assert.equal(barcin.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof barcin.crawlActive, 'function');
  assert.equal(typeof barcin.crawlResults, 'function');
});
