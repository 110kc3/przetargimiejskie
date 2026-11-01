import test from 'node:test';
import assert from 'node:assert/strict';
import bukowno from '../src/cities/bukowno/index.js';

test('Bukowno adapter initializes with valid configuration', () => {
  assert.equal(bukowno.id, 'bukowno');
  assert.equal(bukowno.teryt, '1212011');
  assert.equal(bukowno.label, 'Bukowno');
  assert.equal(bukowno.voivodeship, 'malopolskie');
  assert.equal(typeof bukowno.crawlActive, 'function');
  assert.equal(typeof bukowno.crawlResults, 'function');
});
