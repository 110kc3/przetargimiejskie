import test from 'node:test';
import assert from 'node:assert/strict';
import warta from '../src/cities/warta/index.js';

test('Warta adapter initializes with valid configuration', () => {
  assert.equal(warta.id, 'warta');
  assert.equal(warta.teryt, '1014094');
  assert.equal(warta.label, 'Warta');
  assert.equal(warta.voivodeship, 'lodzkie');
  assert.equal(typeof warta.crawlActive, 'function');
  assert.equal(typeof warta.crawlResults, 'function');
});
