import test from 'node:test';
import assert from 'node:assert/strict';
import lipsk from '../src/cities/lipsk/index.js';

test('Lipsk adapter initializes with valid configuration', () => {
  assert.equal(lipsk.id, 'lipsk');
  assert.equal(lipsk.teryt, '2001044');
  assert.equal(lipsk.label, 'Lipsk');
  assert.equal(lipsk.voivodeship, 'podlaskie');
  assert.equal(typeof lipsk.crawlActive, 'function');
  assert.equal(typeof lipsk.crawlResults, 'function');
});
