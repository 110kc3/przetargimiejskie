import test from 'node:test';
import assert from 'node:assert/strict';
import krzywin from '../src/cities/krzywin/index.js';

test('Krzywiń adapter initializes with valid configuration', () => {
  assert.equal(krzywin.id, 'krzywin');
  assert.equal(krzywin.teryt, '3011044');
  assert.equal(krzywin.label, 'Krzywiń');
  assert.equal(krzywin.voivodeship, 'wielkopolskie');
  assert.equal(typeof krzywin.crawlActive, 'function');
  assert.equal(typeof krzywin.crawlResults, 'function');
});
