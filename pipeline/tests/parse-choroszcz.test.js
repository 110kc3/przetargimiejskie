import test from 'node:test';
import assert from 'node:assert/strict';
import choroszcz from '../src/cities/choroszcz/index.js';

test('Choroszcz adapter initializes with valid configuration', () => {
  assert.equal(choroszcz.id, 'choroszcz');
  assert.equal(choroszcz.teryt, '2002014');
  assert.equal(choroszcz.label, 'Choroszcz');
  assert.equal(choroszcz.voivodeship, 'podlaskie');
  assert.equal(typeof choroszcz.crawlActive, 'function');
  assert.equal(typeof choroszcz.crawlResults, 'function');
});
