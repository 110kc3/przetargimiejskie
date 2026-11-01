import test from 'node:test';
import assert from 'node:assert/strict';
import przedecz from '../src/cities/przedecz/index.js';

test('Przedecz adapter initializes with valid configuration', () => {
  assert.equal(przedecz.id, 'przedecz');
  assert.equal(przedecz.teryt, '3009114');
  assert.equal(przedecz.label, 'Przedecz');
  assert.equal(przedecz.voivodeship, 'wielkopolskie');
  assert.equal(typeof przedecz.crawlActive, 'function');
  assert.equal(typeof przedecz.crawlResults, 'function');
});
