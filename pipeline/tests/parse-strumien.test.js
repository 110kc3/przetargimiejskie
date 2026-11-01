import test from 'node:test';
import assert from 'node:assert/strict';
import strumien from '../src/cities/strumien/index.js';

test('Strumień adapter initializes with valid configuration', () => {
  assert.equal(strumien.id, 'strumien');
  assert.equal(strumien.teryt, '2403114');
  assert.equal(strumien.label, 'Strumień');
  assert.equal(strumien.voivodeship, 'slaskie');
  assert.equal(typeof strumien.crawlActive, 'function');
  assert.equal(typeof strumien.crawlResults, 'function');
});
