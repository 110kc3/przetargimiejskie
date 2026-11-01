import test from 'node:test';
import assert from 'node:assert/strict';
import labiszyn from '../src/cities/labiszyn/index.js';

test('Łabiszyn adapter initializes with valid configuration', () => {
  assert.equal(labiszyn.id, 'labiszyn');
  assert.equal(labiszyn.teryt, '0419044');
  assert.equal(labiszyn.label, 'Łabiszyn');
  assert.equal(labiszyn.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof labiszyn.crawlActive, 'function');
  assert.equal(typeof labiszyn.crawlResults, 'function');
});
