import test from 'node:test';
import assert from 'node:assert/strict';
import limanowa from '../src/cities/limanowa/index.js';

test('Limanowa adapter initializes with valid configuration', () => {
  assert.equal(limanowa.id, 'limanowa');
  assert.equal(limanowa.teryt, '1207011');
  assert.equal(limanowa.label, 'Limanowa');
  assert.equal(limanowa.voivodeship, 'malopolskie');
  assert.equal(typeof limanowa.crawlActive, 'function');
  assert.equal(typeof limanowa.crawlResults, 'function');
});
