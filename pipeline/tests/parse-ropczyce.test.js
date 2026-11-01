import test from 'node:test';
import assert from 'node:assert/strict';
import ropczyce from '../src/cities/ropczyce/index.js';

test('Ropczyce adapter initializes with valid configuration', () => {
  assert.equal(ropczyce.id, 'ropczyce');
  assert.equal(ropczyce.teryt, '1815034');
  assert.equal(ropczyce.label, 'Ropczyce');
  assert.equal(ropczyce.voivodeship, 'podkarpackie');
  assert.equal(typeof ropczyce.crawlActive, 'function');
  assert.equal(typeof ropczyce.crawlResults, 'function');
});
