import test from 'node:test';
import assert from 'node:assert/strict';
import radzymin from '../src/cities/radzymin/index.js';

test('Radzymin adapter initializes with valid configuration', () => {
  assert.equal(radzymin.id, 'radzymin');
  assert.equal(radzymin.teryt, '1434094');
  assert.equal(radzymin.label, 'Radzymin');
  assert.equal(radzymin.voivodeship, 'mazowieckie');
  assert.equal(typeof radzymin.crawlActive, 'function');
  assert.equal(typeof radzymin.crawlResults, 'function');
});
