import test from 'node:test';
import assert from 'node:assert/strict';
import gluszyca from '../src/cities/gluszyca/index.js';

test('Głuszyca adapter initializes with valid configuration', () => {
  assert.equal(gluszyca.id, 'gluszyca');
  assert.equal(gluszyca.teryt, '0221054');
  assert.equal(gluszyca.label, 'Głuszyca');
  assert.equal(gluszyca.voivodeship, 'dolnoslaskie');
  assert.equal(typeof gluszyca.crawlActive, 'function');
  assert.equal(typeof gluszyca.crawlResults, 'function');
});
