import test from 'node:test';
import assert from 'node:assert/strict';
import strzeleczki from '../src/cities/strzeleczki/index.js';

test('Strzeleczki adapter initializes with valid configuration', () => {
  assert.equal(strzeleczki.id, 'strzeleczki');
  assert.equal(strzeleczki.teryt, '1605034');
  assert.equal(strzeleczki.label, 'Strzeleczki');
  assert.equal(strzeleczki.voivodeship, 'opolskie');
  assert.equal(typeof strzeleczki.crawlActive, 'function');
  assert.equal(typeof strzeleczki.crawlResults, 'function');
});
