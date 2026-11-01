import test from 'node:test';
import assert from 'node:assert/strict';
import rejowiec from '../src/cities/rejowiec/index.js';

test('Rejowiec adapter initializes with valid configuration', () => {
  assert.equal(rejowiec.id, 'rejowiec');
  assert.equal(rejowiec.teryt, '0603154');
  assert.equal(rejowiec.label, 'Rejowiec');
  assert.equal(rejowiec.voivodeship, 'lubelskie');
  assert.equal(typeof rejowiec.crawlActive, 'function');
  assert.equal(typeof rejowiec.crawlResults, 'function');
});
