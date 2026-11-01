import test from 'node:test';
import assert from 'node:assert/strict';
import wladyslawowo from '../src/cities/wladyslawowo/index.js';

test('Władysławowo adapter initializes with valid configuration', () => {
  assert.equal(wladyslawowo.id, 'wladyslawowo');
  assert.equal(wladyslawowo.teryt, '2211044');
  assert.equal(wladyslawowo.label, 'Władysławowo');
  assert.equal(wladyslawowo.voivodeship, 'pomorskie');
  assert.equal(typeof wladyslawowo.crawlActive, 'function');
  assert.equal(typeof wladyslawowo.crawlResults, 'function');
});
