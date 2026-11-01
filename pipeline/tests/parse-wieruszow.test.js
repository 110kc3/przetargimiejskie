import test from 'node:test';
import assert from 'node:assert/strict';
import wieruszow from '../src/cities/wieruszow/index.js';

test('Wieruszów adapter initializes with valid configuration', () => {
  assert.equal(wieruszow.id, 'wieruszow');
  assert.equal(wieruszow.teryt, '1018074');
  assert.equal(wieruszow.label, 'Wieruszów');
  assert.equal(wieruszow.voivodeship, 'lodzkie');
  assert.equal(typeof wieruszow.crawlActive, 'function');
  assert.equal(typeof wieruszow.crawlResults, 'function');
});
