import test from 'node:test';
import assert from 'node:assert/strict';
import slomniki from '../src/cities/slomniki/index.js';

test('Słomniki adapter initializes with valid configuration', () => {
  assert.equal(slomniki.id, 'slomniki');
  assert.equal(slomniki.teryt, '1206124');
  assert.equal(slomniki.label, 'Słomniki');
  assert.equal(slomniki.voivodeship, 'malopolskie');
  assert.equal(typeof slomniki.crawlActive, 'function');
  assert.equal(typeof slomniki.crawlResults, 'function');
});
