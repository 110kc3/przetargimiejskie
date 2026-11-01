import test from 'node:test';
import assert from 'node:assert/strict';
import glowaczow from '../src/cities/glowaczow/index.js';

test('Głowaczów adapter initializes with valid configuration', () => {
  assert.equal(glowaczow.id, 'glowaczow');
  assert.equal(glowaczow.teryt, '1407024');
  assert.equal(glowaczow.label, 'Głowaczów');
  assert.equal(glowaczow.voivodeship, 'mazowieckie');
  assert.equal(typeof glowaczow.crawlActive, 'function');
  assert.equal(typeof glowaczow.crawlResults, 'function');
});
