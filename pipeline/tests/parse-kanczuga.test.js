import test from 'node:test';
import assert from 'node:assert/strict';
import kanczuga from '../src/cities/kanczuga/index.js';

test('Kańczuga adapter initializes with valid configuration', () => {
  assert.equal(kanczuga.id, 'kanczuga');
  assert.equal(kanczuga.teryt, '1814054');
  assert.equal(kanczuga.label, 'Kańczuga');
  assert.equal(kanczuga.voivodeship, 'podkarpackie');
  assert.equal(typeof kanczuga.crawlActive, 'function');
  assert.equal(typeof kanczuga.crawlResults, 'function');
});
