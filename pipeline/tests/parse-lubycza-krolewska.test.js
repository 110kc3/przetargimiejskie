import test from 'node:test';
import assert from 'node:assert/strict';
import lubyczaKrolewska from '../src/cities/lubycza-krolewska/index.js';

test('Lubycza Królewska adapter initializes with valid configuration', () => {
  assert.equal(lubyczaKrolewska.id, 'lubycza-krolewska');
  assert.equal(lubyczaKrolewska.teryt, '0618054');
  assert.equal(lubyczaKrolewska.label, 'Lubycza Królewska');
  assert.equal(lubyczaKrolewska.voivodeship, 'lubelskie');
  assert.equal(typeof lubyczaKrolewska.crawlActive, 'function');
  assert.equal(typeof lubyczaKrolewska.crawlResults, 'function');
});
