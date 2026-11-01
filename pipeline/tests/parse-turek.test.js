import test from 'node:test';
import assert from 'node:assert/strict';
import turek from '../src/cities/turek/index.js';

test('Turek adapter initializes with valid configuration', () => {
  assert.equal(turek.id, 'turek');
  assert.equal(turek.teryt, '3027011');
  assert.equal(turek.label, 'Turek');
  assert.equal(turek.voivodeship, 'wielkopolskie');
  assert.equal(typeof turek.crawlActive, 'function');
  assert.equal(typeof turek.crawlResults, 'function');
});
