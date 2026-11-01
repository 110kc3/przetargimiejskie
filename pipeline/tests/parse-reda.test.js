import test from 'node:test';
import assert from 'node:assert/strict';
import reda from '../src/cities/reda/index.js';

test('Reda adapter initializes with valid configuration', () => {
  assert.equal(reda.id, 'reda');
  assert.equal(reda.teryt, '2215011');
  assert.equal(reda.label, 'Reda');
  assert.equal(reda.voivodeship, 'pomorskie');
  assert.equal(typeof reda.crawlActive, 'function');
  assert.equal(typeof reda.crawlResults, 'function');
});
