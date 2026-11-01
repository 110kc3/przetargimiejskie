import test from 'node:test';
import assert from 'node:assert/strict';
import lapy from '../src/cities/lapy/index.js';

test('Łapy adapter initializes with valid configuration', () => {
  assert.equal(lapy.id, 'lapy');
  assert.equal(lapy.teryt, '2002064');
  assert.equal(lapy.label, 'Łapy');
  assert.equal(lapy.voivodeship, 'podlaskie');
  assert.equal(typeof lapy.crawlActive, 'function');
  assert.equal(typeof lapy.crawlResults, 'function');
});
