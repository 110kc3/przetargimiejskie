import test from 'node:test';
import assert from 'node:assert/strict';
import dobiegniew from '../src/cities/dobiegniew/index.js';

test('Dobiegniew adapter initializes with valid configuration', () => {
  assert.equal(dobiegniew.id, 'dobiegniew');
  assert.equal(dobiegniew.teryt, '0806014');
  assert.equal(dobiegniew.label, 'Dobiegniew');
  assert.equal(dobiegniew.voivodeship, 'lubuskie');
  assert.equal(typeof dobiegniew.crawlActive, 'function');
  assert.equal(typeof dobiegniew.crawlResults, 'function');
});
