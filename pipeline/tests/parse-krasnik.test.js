import test from 'node:test';
import assert from 'node:assert/strict';
import krasnik from '../src/cities/krasnik/index.js';

test('Kraśnik adapter initializes with valid configuration', () => {
  assert.equal(krasnik.id, 'krasnik');
  assert.equal(krasnik.teryt, '0607011');
  assert.equal(krasnik.label, 'Kraśnik');
  assert.equal(krasnik.voivodeship, 'lubelskie');
  assert.equal(typeof krasnik.crawlActive, 'function');
  assert.equal(typeof krasnik.crawlResults, 'function');
});
