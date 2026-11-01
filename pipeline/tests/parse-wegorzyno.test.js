import test from 'node:test';
import assert from 'node:assert/strict';
import wegorzyno from '../src/cities/wegorzyno/index.js';

test('Węgorzyno adapter initializes with valid configuration', () => {
  assert.equal(wegorzyno.id, 'wegorzyno');
  assert.equal(wegorzyno.teryt, '3218054');
  assert.equal(wegorzyno.label, 'Węgorzyno');
  assert.equal(wegorzyno.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof wegorzyno.crawlActive, 'function');
  assert.equal(typeof wegorzyno.crawlResults, 'function');
});
