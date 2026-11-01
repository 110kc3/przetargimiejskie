import test from 'node:test';
import assert from 'node:assert/strict';
import szprotawa from '../src/cities/szprotawa/index.js';

test('Szprotawa adapter initializes with valid configuration', () => {
  assert.equal(szprotawa.id, 'szprotawa');
  assert.equal(szprotawa.teryt, '0810074');
  assert.equal(szprotawa.label, 'Szprotawa');
  assert.equal(szprotawa.voivodeship, 'lubuskie');
  assert.equal(typeof szprotawa.crawlActive, 'function');
  assert.equal(typeof szprotawa.crawlResults, 'function');
});
