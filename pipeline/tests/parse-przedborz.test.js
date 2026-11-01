import test from 'node:test';
import assert from 'node:assert/strict';
import przedborz from '../src/cities/przedborz/index.js';

test('Przedbórz adapter initializes with valid configuration', () => {
  assert.equal(przedborz.id, 'przedborz');
  assert.equal(przedborz.teryt, '1012114');
  assert.equal(przedborz.label, 'Przedbórz');
  assert.equal(przedborz.voivodeship, 'lodzkie');
  assert.equal(typeof przedborz.crawlActive, 'function');
  assert.equal(typeof przedborz.crawlResults, 'function');
});
