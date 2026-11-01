import test from 'node:test';
import assert from 'node:assert/strict';
import slupca from '../src/cities/slupca/index.js';

test('Słupca adapter initializes with valid configuration', () => {
  assert.equal(slupca.id, 'slupca');
  assert.equal(slupca.teryt, '3023011');
  assert.equal(slupca.label, 'Słupca');
  assert.equal(slupca.voivodeship, 'wielkopolskie');
  assert.equal(typeof slupca.crawlActive, 'function');
  assert.equal(typeof slupca.crawlResults, 'function');
});
