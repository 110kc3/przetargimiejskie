import test from 'node:test';
import assert from 'node:assert/strict';
import ostrowLubelski from '../src/cities/ostrow-lubelski/index.js';

test('Ostrów Lubelski adapter initializes with valid configuration', () => {
  assert.equal(ostrowLubelski.id, 'ostrow-lubelski');
  assert.equal(ostrowLubelski.teryt, '0608104');
  assert.equal(ostrowLubelski.label, 'Ostrów Lubelski');
  assert.equal(ostrowLubelski.voivodeship, 'lubelskie');
  assert.equal(typeof ostrowLubelski.crawlActive, 'function');
  assert.equal(typeof ostrowLubelski.crawlResults, 'function');
});
