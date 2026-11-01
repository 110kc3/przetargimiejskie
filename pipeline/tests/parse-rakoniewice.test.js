import test from 'node:test';
import assert from 'node:assert/strict';
import rakoniewice from '../src/cities/rakoniewice/index.js';

test('Rakoniewice adapter initializes with valid configuration', () => {
  assert.equal(rakoniewice.id, 'rakoniewice');
  assert.equal(rakoniewice.teryt, '3005044');
  assert.equal(rakoniewice.label, 'Rakoniewice');
  assert.equal(rakoniewice.voivodeship, 'wielkopolskie');
  assert.equal(typeof rakoniewice.crawlActive, 'function');
  assert.equal(typeof rakoniewice.crawlResults, 'function');
});
