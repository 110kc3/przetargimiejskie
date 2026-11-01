import test from 'node:test';
import assert from 'node:assert/strict';
import wyrzysk from '../src/cities/wyrzysk/index.js';

test('Wyrzysk adapter initializes with valid configuration', () => {
  assert.equal(wyrzysk.id, 'wyrzysk');
  assert.equal(wyrzysk.teryt, '3019084');
  assert.equal(wyrzysk.label, 'Wyrzysk');
  assert.equal(wyrzysk.voivodeship, 'wielkopolskie');
  assert.equal(typeof wyrzysk.crawlActive, 'function');
  assert.equal(typeof wyrzysk.crawlResults, 'function');
});
