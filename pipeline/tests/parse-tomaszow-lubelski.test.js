import test from 'node:test';
import assert from 'node:assert/strict';
import tomaszowLubelski from '../src/cities/tomaszow-lubelski/index.js';

test('Tomaszów Lubelski adapter initializes with valid configuration', () => {
  assert.equal(tomaszowLubelski.id, 'tomaszow-lubelski');
  assert.equal(tomaszowLubelski.teryt, '0618011');
  assert.equal(tomaszowLubelski.label, 'Tomaszów Lubelski');
  assert.equal(tomaszowLubelski.voivodeship, 'lubelskie');
  assert.equal(typeof tomaszowLubelski.crawlActive, 'function');
  assert.equal(typeof tomaszowLubelski.crawlResults, 'function');
});
