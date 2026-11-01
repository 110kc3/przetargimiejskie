import test from 'node:test';
import assert from 'node:assert/strict';
import radlin from '../src/cities/radlin/index.js';

test('Radlin adapter initializes with valid configuration', () => {
  assert.equal(radlin.id, 'radlin');
  assert.equal(radlin.teryt, '2415021');
  assert.equal(radlin.label, 'Radlin');
  assert.equal(radlin.voivodeship, 'slaskie');
  assert.equal(typeof radlin.crawlActive, 'function');
  assert.equal(typeof radlin.crawlResults, 'function');
});
