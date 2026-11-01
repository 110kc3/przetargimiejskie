import test from 'node:test';
import assert from 'node:assert/strict';
import cieszanow from '../src/cities/cieszanow/index.js';

test('Cieszanów adapter initializes with valid configuration', () => {
  assert.equal(cieszanow.id, 'cieszanow');
  assert.equal(cieszanow.teryt, '1809024');
  assert.equal(cieszanow.label, 'Cieszanów');
  assert.equal(cieszanow.voivodeship, 'podkarpackie');
  assert.equal(typeof cieszanow.crawlActive, 'function');
  assert.equal(typeof cieszanow.crawlResults, 'function');
});
