import test from 'node:test';
import assert from 'node:assert/strict';
import wagrowiec from '../src/cities/wagrowiec/index.js';

test('Wągrowiec adapter initializes with valid configuration', () => {
  assert.equal(wagrowiec.id, 'wagrowiec');
  assert.equal(wagrowiec.teryt, '3028011');
  assert.equal(wagrowiec.label, 'Wągrowiec');
  assert.equal(wagrowiec.voivodeship, 'wielkopolskie');
  assert.equal(typeof wagrowiec.crawlActive, 'function');
  assert.equal(typeof wagrowiec.crawlResults, 'function');
});
