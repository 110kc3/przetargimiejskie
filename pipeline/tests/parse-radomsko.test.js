import test from 'node:test';
import assert from 'node:assert/strict';
import radomsko from '../src/cities/radomsko/index.js';

test('Radomsko adapter initializes with valid configuration', () => {
  assert.equal(radomsko.id, 'radomsko');
  assert.equal(radomsko.teryt, '1012011');
  assert.equal(radomsko.label, 'Radomsko');
  assert.equal(radomsko.voivodeship, 'lodzkie');
  assert.equal(typeof radomsko.crawlActive, 'function');
  assert.equal(typeof radomsko.crawlResults, 'function');
});
