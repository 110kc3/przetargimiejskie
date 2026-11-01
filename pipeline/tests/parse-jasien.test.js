import test from 'node:test';
import assert from 'node:assert/strict';
import jasien from '../src/cities/jasien/index.js';

test('Jasień adapter initializes with valid configuration', () => {
  assert.equal(jasien.id, 'jasien');
  assert.equal(jasien.teryt, '0811044');
  assert.equal(jasien.label, 'Jasień');
  assert.equal(jasien.voivodeship, 'lubuskie');
  assert.equal(typeof jasien.crawlActive, 'function');
  assert.equal(typeof jasien.crawlResults, 'function');
});
