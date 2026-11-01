import test from 'node:test';
import assert from 'node:assert/strict';
import goniadz from '../src/cities/goniadz/index.js';

test('Goniądz adapter initializes with valid configuration', () => {
  assert.equal(goniadz.id, 'goniadz');
  assert.equal(goniadz.teryt, '2008014');
  assert.equal(goniadz.label, 'Goniądz');
  assert.equal(goniadz.voivodeship, 'podlaskie');
  assert.equal(typeof goniadz.crawlActive, 'function');
  assert.equal(typeof goniadz.crawlResults, 'function');
});
