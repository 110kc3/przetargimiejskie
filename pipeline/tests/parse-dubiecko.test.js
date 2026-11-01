import test from 'node:test';
import assert from 'node:assert/strict';
import dubiecko from '../src/cities/dubiecko/index.js';

test('Dubiecko adapter initializes with valid configuration', () => {
  assert.equal(dubiecko.id, 'dubiecko');
  assert.equal(dubiecko.teryt, '1813024');
  assert.equal(dubiecko.label, 'Dubiecko');
  assert.equal(dubiecko.voivodeship, 'podkarpackie');
  assert.equal(typeof dubiecko.crawlActive, 'function');
  assert.equal(typeof dubiecko.crawlResults, 'function');
});
