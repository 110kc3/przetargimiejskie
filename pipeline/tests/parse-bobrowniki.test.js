import test from 'node:test';
import assert from 'node:assert/strict';
import bobrowniki from '../src/cities/bobrowniki/index.js';

test('Bobrowniki adapter initializes with valid configuration', () => {
  assert.equal(bobrowniki.id, 'bobrowniki');
  assert.equal(bobrowniki.teryt, '0408024');
  assert.equal(bobrowniki.label, 'Bobrowniki');
  assert.equal(bobrowniki.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof bobrowniki.crawlActive, 'function');
  assert.equal(typeof bobrowniki.crawlResults, 'function');
});
