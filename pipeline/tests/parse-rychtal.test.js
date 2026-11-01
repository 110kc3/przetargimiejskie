import test from 'node:test';
import assert from 'node:assert/strict';
import rychtal from '../src/cities/rychtal/index.js';

test('Rychtal adapter initializes with valid configuration', () => {
  assert.equal(rychtal.id, 'rychtal');
  assert.equal(rychtal.teryt, '3008064');
  assert.equal(rychtal.label, 'Rychtal');
  assert.equal(rychtal.voivodeship, 'wielkopolskie');
  assert.equal(typeof rychtal.crawlActive, 'function');
  assert.equal(typeof rychtal.crawlResults, 'function');
});
