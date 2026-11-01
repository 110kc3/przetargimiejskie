import test from 'node:test';
import assert from 'node:assert/strict';
import babimost from '../src/cities/babimost/index.js';

test('Babimost adapter initializes with valid configuration', () => {
  assert.equal(babimost.id, 'babimost');
  assert.equal(babimost.teryt, '0809014');
  assert.equal(babimost.label, 'Babimost');
  assert.equal(babimost.voivodeship, 'lubuskie');
  assert.equal(typeof babimost.crawlActive, 'function');
  assert.equal(typeof babimost.crawlResults, 'function');
});
