import test from 'node:test';
import assert from 'node:assert/strict';
import bobowa from '../src/cities/bobowa/index.js';

test('Bobowa adapter initializes with valid configuration', () => {
  assert.equal(bobowa.id, 'bobowa');
  assert.equal(bobowa.teryt, '1205034');
  assert.equal(bobowa.label, 'Bobowa');
  assert.equal(bobowa.voivodeship, 'malopolskie');
  assert.equal(typeof bobowa.crawlActive, 'function');
  assert.equal(typeof bobowa.crawlResults, 'function');
});
