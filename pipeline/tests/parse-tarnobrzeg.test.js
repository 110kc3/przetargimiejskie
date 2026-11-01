import test from 'node:test';
import assert from 'node:assert/strict';
import tarnobrzeg from '../src/cities/tarnobrzeg/index.js';

test('Tarnobrzeg adapter initializes with valid configuration', () => {
  assert.equal(tarnobrzeg.id, 'tarnobrzeg');
  assert.equal(tarnobrzeg.teryt, '1864011');
  assert.equal(tarnobrzeg.label, 'Tarnobrzeg');
  assert.equal(tarnobrzeg.voivodeship, 'podkarpackie');
  assert.equal(typeof tarnobrzeg.crawlActive, 'function');
  assert.equal(typeof tarnobrzeg.crawlResults, 'function');
});
