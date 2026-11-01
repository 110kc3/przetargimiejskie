import test from 'node:test';
import assert from 'node:assert/strict';
import turobin from '../src/cities/turobin/index.js';

test('Turobin adapter initializes with valid configuration', () => {
  assert.equal(turobin.id, 'turobin');
  assert.equal(turobin.teryt, '0602144');
  assert.equal(turobin.label, 'Turobin');
  assert.equal(turobin.voivodeship, 'lubelskie');
  assert.equal(typeof turobin.crawlActive, 'function');
  assert.equal(typeof turobin.crawlResults, 'function');
});
