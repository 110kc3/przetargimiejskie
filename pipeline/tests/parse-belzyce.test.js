import test from 'node:test';
import assert from 'node:assert/strict';
import belzyce from '../src/cities/belzyce/index.js';

test('Bełżyce adapter initializes with valid configuration', () => {
  assert.equal(belzyce.id, 'belzyce');
  assert.equal(belzyce.teryt, '0609014');
  assert.equal(belzyce.label, 'Bełżyce');
  assert.equal(belzyce.voivodeship, 'lubelskie');
  assert.equal(typeof belzyce.crawlActive, 'function');
  assert.equal(typeof belzyce.crawlResults, 'function');
});
