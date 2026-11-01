import test from 'node:test';
import assert from 'node:assert/strict';
import suprasl from '../src/cities/suprasl/index.js';

test('Supraśl adapter initializes with valid configuration', () => {
  assert.equal(suprasl.id, 'suprasl');
  assert.equal(suprasl.teryt, '2002094');
  assert.equal(suprasl.label, 'Supraśl');
  assert.equal(suprasl.voivodeship, 'podlaskie');
  assert.equal(typeof suprasl.crawlActive, 'function');
  assert.equal(typeof suprasl.crawlResults, 'function');
});
