import test from 'node:test';
import assert from 'node:assert/strict';
import skepe from '../src/cities/skepe/index.js';

test('Skępe adapter initializes with valid configuration', () => {
  assert.equal(skepe.id, 'skepe');
  assert.equal(skepe.teryt, '0408074');
  assert.equal(skepe.label, 'Skępe');
  assert.equal(skepe.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof skepe.crawlActive, 'function');
  assert.equal(typeof skepe.crawlResults, 'function');
});
