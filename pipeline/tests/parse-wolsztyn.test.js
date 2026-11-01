import test from 'node:test';
import assert from 'node:assert/strict';
import wolsztyn from '../src/cities/wolsztyn/index.js';

test('Wolsztyn adapter initializes with valid configuration', () => {
  assert.equal(wolsztyn.id, 'wolsztyn');
  assert.equal(wolsztyn.teryt, '3029034');
  assert.equal(wolsztyn.label, 'Wolsztyn');
  assert.equal(wolsztyn.voivodeship, 'wielkopolskie');
  assert.equal(typeof wolsztyn.crawlActive, 'function');
  assert.equal(typeof wolsztyn.crawlResults, 'function');
});
