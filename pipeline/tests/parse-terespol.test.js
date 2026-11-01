import test from 'node:test';
import assert from 'node:assert/strict';
import terespol from '../src/cities/terespol/index.js';

test('Terespol adapter initializes with valid configuration', () => {
  assert.equal(terespol.id, 'terespol');
  assert.equal(terespol.teryt, '0601021');
  assert.equal(terespol.label, 'Terespol');
  assert.equal(terespol.voivodeship, 'lubelskie');
  assert.equal(typeof terespol.crawlActive, 'function');
  assert.equal(typeof terespol.crawlResults, 'function');
});
