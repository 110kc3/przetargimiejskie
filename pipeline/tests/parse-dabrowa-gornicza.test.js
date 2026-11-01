import test from 'node:test';
import assert from 'node:assert/strict';
import dabrowaGornicza from '../src/cities/dabrowa-gornicza/index.js';

test('Dąbrowa Górnicza adapter initializes with valid configuration', () => {
  assert.equal(dabrowaGornicza.id, 'dabrowa-gornicza');
  assert.equal(dabrowaGornicza.teryt, '2465011');
  assert.equal(dabrowaGornicza.label, 'Dąbrowa Górnicza');
  assert.equal(dabrowaGornicza.voivodeship, 'slaskie');
  assert.equal(typeof dabrowaGornicza.crawlActive, 'function');
  assert.equal(typeof dabrowaGornicza.crawlResults, 'function');
});
