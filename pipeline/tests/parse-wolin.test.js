import test from 'node:test';
import assert from 'node:assert/strict';
import wolin from '../src/cities/wolin/index.js';

test('Wolin adapter initializes with valid configuration', () => {
  assert.equal(wolin.id, 'wolin');
  assert.equal(wolin.teryt, '3207064');
  assert.equal(wolin.label, 'Wolin');
  assert.equal(wolin.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof wolin.crawlActive, 'function');
  assert.equal(typeof wolin.crawlResults, 'function');
});
