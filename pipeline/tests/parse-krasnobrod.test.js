import test from 'node:test';
import assert from 'node:assert/strict';
import krasnobrod from '../src/cities/krasnobrod/index.js';

test('Krasnobród adapter initializes with valid configuration', () => {
  assert.equal(krasnobrod.id, 'krasnobrod');
  assert.equal(krasnobrod.teryt, '0620044');
  assert.equal(krasnobrod.label, 'Krasnobród');
  assert.equal(krasnobrod.voivodeship, 'lubelskie');
  assert.equal(typeof krasnobrod.crawlActive, 'function');
  assert.equal(typeof krasnobrod.crawlResults, 'function');
});
