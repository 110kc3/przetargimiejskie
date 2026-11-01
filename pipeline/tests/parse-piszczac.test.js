import test from 'node:test';
import assert from 'node:assert/strict';
import piszczac from '../src/cities/piszczac/index.js';

test('Piszczac adapter initializes with valid configuration', () => {
  assert.equal(piszczac.id, 'piszczac');
  assert.equal(piszczac.teryt, '0601114');
  assert.equal(piszczac.label, 'Piszczac');
  assert.equal(piszczac.voivodeship, 'lubelskie');
  assert.equal(typeof piszczac.crawlActive, 'function');
  assert.equal(typeof piszczac.crawlResults, 'function');
});
