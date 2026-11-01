import test from 'node:test';
import assert from 'node:assert/strict';
import alwernia from '../src/cities/alwernia/index.js';

test('Alwernia adapter initializes with valid configuration', () => {
  assert.equal(alwernia.id, 'alwernia');
  assert.equal(alwernia.teryt, '1203014');
  assert.equal(alwernia.label, 'Alwernia');
  assert.equal(alwernia.voivodeship, 'malopolskie');
  assert.equal(typeof alwernia.crawlActive, 'function');
  assert.equal(typeof alwernia.crawlResults, 'function');
});
