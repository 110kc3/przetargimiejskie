import test from 'node:test';
import assert from 'node:assert/strict';
import glowno from '../src/cities/glowno/index.js';

test('Głowno adapter initializes with valid configuration', () => {
  assert.equal(glowno.id, 'glowno');
  assert.equal(glowno.teryt, '1020011');
  assert.equal(glowno.label, 'Głowno');
  assert.equal(glowno.voivodeship, 'lodzkie');
  assert.equal(typeof glowno.crawlActive, 'function');
  assert.equal(typeof glowno.crawlResults, 'function');
});
