import test from 'node:test';
import assert from 'node:assert/strict';
import kety from '../src/cities/kety/index.js';

test('Kęty adapter initializes with valid configuration', () => {
  assert.equal(kety.id, 'kety');
  assert.equal(kety.teryt, '1213044');
  assert.equal(kety.label, 'Kęty');
  assert.equal(kety.voivodeship, 'malopolskie');
  assert.equal(typeof kety.crawlActive, 'function');
  assert.equal(typeof kety.crawlResults, 'function');
});
