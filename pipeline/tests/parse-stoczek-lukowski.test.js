import test from 'node:test';
import assert from 'node:assert/strict';
import stoczekLukowski from '../src/cities/stoczek-lukowski/index.js';

test('Stoczek Łukowski adapter initializes with valid configuration', () => {
  assert.equal(stoczekLukowski.id, 'stoczek-lukowski');
  assert.equal(stoczekLukowski.teryt, '0611021');
  assert.equal(stoczekLukowski.label, 'Stoczek Łukowski');
  assert.equal(stoczekLukowski.voivodeship, 'lubelskie');
  assert.equal(typeof stoczekLukowski.crawlActive, 'function');
  assert.equal(typeof stoczekLukowski.crawlResults, 'function');
});
