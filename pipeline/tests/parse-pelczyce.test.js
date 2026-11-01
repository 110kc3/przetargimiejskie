import test from 'node:test';
import assert from 'node:assert/strict';
import pelczyce from '../src/cities/pelczyce/index.js';

test('Pełczyce adapter initializes with valid configuration', () => {
  assert.equal(pelczyce.id, 'pelczyce');
  assert.equal(pelczyce.teryt, '3202054');
  assert.equal(pelczyce.label, 'Pełczyce');
  assert.equal(pelczyce.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof pelczyce.crawlActive, 'function');
  assert.equal(typeof pelczyce.crawlResults, 'function');
});
