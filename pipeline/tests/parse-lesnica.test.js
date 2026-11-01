import test from 'node:test';
import assert from 'node:assert/strict';
import lesnica from '../src/cities/lesnica/index.js';

test('Leśnica adapter initializes with valid configuration', () => {
  assert.equal(lesnica.id, 'lesnica');
  assert.equal(lesnica.teryt, '1611044');
  assert.equal(lesnica.label, 'Leśnica');
  assert.equal(lesnica.voivodeship, 'opolskie');
  assert.equal(typeof lesnica.crawlActive, 'function');
  assert.equal(typeof lesnica.crawlResults, 'function');
});
