import test from 'node:test';
import assert from 'node:assert/strict';
import lubsko from '../src/cities/lubsko/index.js';

test('Lubsko adapter initializes with valid configuration', () => {
  assert.equal(lubsko.id, 'lubsko');
  assert.equal(lubsko.teryt, '0811064');
  assert.equal(lubsko.label, 'Lubsko');
  assert.equal(lubsko.voivodeship, 'lubuskie');
  assert.equal(typeof lubsko.crawlActive, 'function');
  assert.equal(typeof lubsko.crawlResults, 'function');
});
