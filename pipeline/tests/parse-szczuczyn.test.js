import test from 'node:test';
import assert from 'node:assert/strict';
import szczuczyn from '../src/cities/szczuczyn/index.js';

test('Szczuczyn adapter initializes with valid configuration', () => {
  assert.equal(szczuczyn.id, 'szczuczyn');
  assert.equal(szczuczyn.teryt, '2004054');
  assert.equal(szczuczyn.label, 'Szczuczyn');
  assert.equal(szczuczyn.voivodeship, 'podlaskie');
  assert.equal(typeof szczuczyn.crawlActive, 'function');
  assert.equal(typeof szczuczyn.crawlResults, 'function');
});
