import test from 'node:test';
import assert from 'node:assert/strict';
import kikol from '../src/cities/kikol/index.js';

test('Kikół adapter initializes with valid configuration', () => {
  assert.equal(kikol.id, 'kikol');
  assert.equal(kikol.teryt, '0408054');
  assert.equal(kikol.label, 'Kikół');
  assert.equal(kikol.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof kikol.crawlActive, 'function');
  assert.equal(typeof kikol.crawlResults, 'function');
});
