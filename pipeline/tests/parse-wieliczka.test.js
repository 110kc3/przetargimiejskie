import test from 'node:test';
import assert from 'node:assert/strict';
import wieliczka from '../src/cities/wieliczka/index.js';

test('Wieliczka adapter initializes with valid configuration', () => {
  assert.equal(wieliczka.id, 'wieliczka');
  assert.equal(wieliczka.teryt, '1219054');
  assert.equal(wieliczka.label, 'Wieliczka');
  assert.equal(wieliczka.voivodeship, 'malopolskie');
  assert.equal(typeof wieliczka.crawlActive, 'function');
  assert.equal(typeof wieliczka.crawlResults, 'function');
});
