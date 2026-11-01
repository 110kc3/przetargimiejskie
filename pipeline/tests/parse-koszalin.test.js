import test from 'node:test';
import assert from 'node:assert/strict';
import koszalin from '../src/cities/koszalin/index.js';

test('Koszalin adapter initializes with valid configuration', () => {
  assert.equal(koszalin.id, 'koszalin');
  assert.equal(koszalin.teryt, '3261011');
  assert.equal(koszalin.label, 'Koszalin');
  assert.equal(koszalin.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof koszalin.crawlActive, 'function');
  assert.equal(typeof koszalin.crawlResults, 'function');
});
