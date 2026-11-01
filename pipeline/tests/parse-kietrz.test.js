import test from 'node:test';
import assert from 'node:assert/strict';
import kietrz from '../src/cities/kietrz/index.js';

test('Kietrz adapter initializes with valid configuration', () => {
  assert.equal(kietrz.id, 'kietrz');
  assert.equal(kietrz.teryt, '1602044');
  assert.equal(kietrz.label, 'Kietrz');
  assert.equal(kietrz.voivodeship, 'opolskie');
  assert.equal(typeof kietrz.crawlActive, 'function');
  assert.equal(typeof kietrz.crawlResults, 'function');
});
