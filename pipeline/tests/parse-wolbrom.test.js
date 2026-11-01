import test from 'node:test';
import assert from 'node:assert/strict';
import wolbrom from '../src/cities/wolbrom/index.js';

test('Wolbrom adapter initializes with valid configuration', () => {
  assert.equal(wolbrom.id, 'wolbrom');
  assert.equal(wolbrom.teryt, '1212074');
  assert.equal(wolbrom.label, 'Wolbrom');
  assert.equal(wolbrom.voivodeship, 'malopolskie');
  assert.equal(typeof wolbrom.crawlActive, 'function');
  assert.equal(typeof wolbrom.crawlResults, 'function');
});
