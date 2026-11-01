import test from 'node:test';
import assert from 'node:assert/strict';
import wlodowice from '../src/cities/wlodowice/index.js';

test('Włodowice adapter initializes with valid configuration', () => {
  assert.equal(wlodowice.id, 'wlodowice');
  assert.equal(wlodowice.teryt, '2416094');
  assert.equal(wlodowice.label, 'Włodowice');
  assert.equal(wlodowice.voivodeship, 'slaskie');
  assert.equal(typeof wlodowice.crawlActive, 'function');
  assert.equal(typeof wlodowice.crawlResults, 'function');
});
