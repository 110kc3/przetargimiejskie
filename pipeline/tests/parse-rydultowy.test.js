import test from 'node:test';
import assert from 'node:assert/strict';
import rydultowy from '../src/cities/rydultowy/index.js';

test('Rydułtowy adapter initializes with valid configuration', () => {
  assert.equal(rydultowy.id, 'rydultowy');
  assert.equal(rydultowy.teryt, '2415031');
  assert.equal(rydultowy.label, 'Rydułtowy');
  assert.equal(rydultowy.voivodeship, 'slaskie');
  assert.equal(typeof rydultowy.crawlActive, 'function');
  assert.equal(typeof rydultowy.crawlResults, 'function');
});
