import test from 'node:test';
import assert from 'node:assert/strict';
import kolaczyce from '../src/cities/kolaczyce/index.js';

test('Kołaczyce adapter initializes with valid configuration', () => {
  assert.equal(kolaczyce.id, 'kolaczyce');
  assert.equal(kolaczyce.teryt, '1805054');
  assert.equal(kolaczyce.label, 'Kołaczyce');
  assert.equal(kolaczyce.voivodeship, 'podkarpackie');
  assert.equal(typeof kolaczyce.crawlActive, 'function');
  assert.equal(typeof kolaczyce.crawlResults, 'function');
});
