import test from 'node:test';
import assert from 'node:assert/strict';
import szczucin from '../src/cities/szczucin/index.js';

test('Szczucin adapter initializes with valid configuration', () => {
  assert.equal(szczucin.id, 'szczucin');
  assert.equal(szczucin.teryt, '1204074');
  assert.equal(szczucin.label, 'Szczucin');
  assert.equal(szczucin.voivodeship, 'malopolskie');
  assert.equal(typeof szczucin.crawlActive, 'function');
  assert.equal(typeof szczucin.crawlResults, 'function');
});
