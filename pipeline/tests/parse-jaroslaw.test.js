import test from 'node:test';
import assert from 'node:assert/strict';
import jaroslaw from '../src/cities/jaroslaw/index.js';

test('Jarosław adapter initializes with valid configuration', () => {
  assert.equal(jaroslaw.id, 'jaroslaw');
  assert.equal(jaroslaw.teryt, '1804011');
  assert.equal(jaroslaw.label, 'Jarosław');
  assert.equal(jaroslaw.voivodeship, 'podkarpackie');
  assert.equal(typeof jaroslaw.crawlActive, 'function');
  assert.equal(typeof jaroslaw.crawlResults, 'function');
});
