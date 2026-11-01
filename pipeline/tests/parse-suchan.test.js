import test from 'node:test';
import assert from 'node:assert/strict';
import suchan from '../src/cities/suchan/index.js';

test('Suchań adapter initializes with valid configuration', () => {
  assert.equal(suchan.id, 'suchan');
  assert.equal(suchan.teryt, '3214114');
  assert.equal(suchan.label, 'Suchań');
  assert.equal(suchan.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof suchan.crawlActive, 'function');
  assert.equal(typeof suchan.crawlResults, 'function');
});
