import test from 'node:test';
import assert from 'node:assert/strict';
import tarnogrod from '../src/cities/tarnogrod/index.js';

test('Tarnogród adapter initializes with valid configuration', () => {
  assert.equal(tarnogrod.id, 'tarnogrod');
  assert.equal(tarnogrod.teryt, '0602124');
  assert.equal(tarnogrod.label, 'Tarnogród');
  assert.equal(tarnogrod.voivodeship, 'lubelskie');
  assert.equal(typeof tarnogrod.crawlActive, 'function');
  assert.equal(typeof tarnogrod.crawlResults, 'function');
});
