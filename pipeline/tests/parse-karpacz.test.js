import test from 'node:test';
import assert from 'node:assert/strict';
import karpacz from '../src/cities/karpacz/index.js';

test('Karpacz adapter initializes with valid configuration', () => {
  assert.equal(karpacz.id, 'karpacz');
  assert.equal(karpacz.teryt, '0206011');
  assert.equal(karpacz.label, 'Karpacz');
  assert.equal(karpacz.voivodeship, 'dolnoslaskie');
  assert.equal(typeof karpacz.crawlActive, 'function');
  assert.equal(typeof karpacz.crawlResults, 'function');
});
