import test from 'node:test';
import assert from 'node:assert/strict';
import skorcz from '../src/cities/skorcz/index.js';

test('Skórcz adapter initializes with valid configuration', () => {
  assert.equal(skorcz.id, 'skorcz');
  assert.equal(skorcz.teryt, '2213021');
  assert.equal(skorcz.label, 'Skórcz');
  assert.equal(skorcz.voivodeship, 'pomorskie');
  assert.equal(typeof skorcz.crawlActive, 'function');
  assert.equal(typeof skorcz.crawlResults, 'function');
});
