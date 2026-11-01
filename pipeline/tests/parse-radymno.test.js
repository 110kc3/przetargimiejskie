import test from 'node:test';
import assert from 'node:assert/strict';
import radymno from '../src/cities/radymno/index.js';

test('Radymno adapter initializes with valid configuration', () => {
  assert.equal(radymno.id, 'radymno');
  assert.equal(radymno.teryt, '1804021');
  assert.equal(radymno.label, 'Radymno');
  assert.equal(radymno.voivodeship, 'podkarpackie');
  assert.equal(typeof radymno.crawlActive, 'function');
  assert.equal(typeof radymno.crawlResults, 'function');
});
