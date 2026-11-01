import test from 'node:test';
import assert from 'node:assert/strict';
import tykocin from '../src/cities/tykocin/index.js';

test('Tykocin adapter initializes with valid configuration', () => {
  assert.equal(tykocin.id, 'tykocin');
  assert.equal(tykocin.teryt, '2002124');
  assert.equal(tykocin.label, 'Tykocin');
  assert.equal(tykocin.voivodeship, 'podlaskie');
  assert.equal(typeof tykocin.crawlActive, 'function');
  assert.equal(typeof tykocin.crawlResults, 'function');
});
