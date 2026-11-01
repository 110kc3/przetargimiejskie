import test from 'node:test';
import assert from 'node:assert/strict';
import modliborzyce from '../src/cities/modliborzyce/index.js';

test('Modliborzyce adapter initializes with valid configuration', () => {
  assert.equal(modliborzyce.id, 'modliborzyce');
  assert.equal(modliborzyce.teryt, '0605064');
  assert.equal(modliborzyce.label, 'Modliborzyce');
  assert.equal(modliborzyce.voivodeship, 'lubelskie');
  assert.equal(typeof modliborzyce.crawlActive, 'function');
  assert.equal(typeof modliborzyce.crawlResults, 'function');
});
