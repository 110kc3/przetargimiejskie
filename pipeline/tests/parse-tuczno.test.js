import test from 'node:test';
import assert from 'node:assert/strict';
import tuczno from '../src/cities/tuczno/index.js';

test('Tuczno adapter initializes with valid configuration', () => {
  assert.equal(tuczno.id, 'tuczno');
  assert.equal(tuczno.teryt, '3217044');
  assert.equal(tuczno.label, 'Tuczno');
  assert.equal(tuczno.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof tuczno.crawlActive, 'function');
  assert.equal(typeof tuczno.crawlResults, 'function');
});
