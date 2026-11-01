import test from 'node:test';
import assert from 'node:assert/strict';
import suraz from '../src/cities/suraz/index.js';

test('Suraż adapter initializes with valid configuration', () => {
  assert.equal(suraz.id, 'suraz');
  assert.equal(suraz.teryt, '2002104');
  assert.equal(suraz.label, 'Suraż');
  assert.equal(suraz.voivodeship, 'podlaskie');
  assert.equal(typeof suraz.crawlActive, 'function');
  assert.equal(typeof suraz.crawlResults, 'function');
});
