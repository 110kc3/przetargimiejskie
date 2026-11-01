import test from 'node:test';
import assert from 'node:assert/strict';
import kargowa from '../src/cities/kargowa/index.js';

test('Kargowa adapter initializes with valid configuration', () => {
  assert.equal(kargowa.id, 'kargowa');
  assert.equal(kargowa.teryt, '0809044');
  assert.equal(kargowa.label, 'Kargowa');
  assert.equal(kargowa.voivodeship, 'lubuskie');
  assert.equal(typeof kargowa.crawlActive, 'function');
  assert.equal(typeof kargowa.crawlResults, 'function');
});
