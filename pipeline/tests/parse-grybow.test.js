import test from 'node:test';
import assert from 'node:assert/strict';
import grybow from '../src/cities/grybow/index.js';

test('Grybów adapter initializes with valid configuration', () => {
  assert.equal(grybow.id, 'grybow');
  assert.equal(grybow.teryt, '1210011');
  assert.equal(grybow.label, 'Grybów');
  assert.equal(grybow.voivodeship, 'malopolskie');
  assert.equal(typeof grybow.crawlActive, 'function');
  assert.equal(typeof grybow.crawlResults, 'function');
});
