import test from 'node:test';
import assert from 'node:assert/strict';
import lasin from '../src/cities/lasin/index.js';

test('Łasin adapter initializes with valid configuration', () => {
  assert.equal(lasin.id, 'lasin');
  assert.equal(lasin.teryt, '0406034');
  assert.equal(lasin.label, 'Łasin');
  assert.equal(lasin.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof lasin.crawlActive, 'function');
  assert.equal(typeof lasin.crawlResults, 'function');
});
