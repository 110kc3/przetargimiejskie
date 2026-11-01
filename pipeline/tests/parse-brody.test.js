import test from 'node:test';
import assert from 'node:assert/strict';
import brody from '../src/cities/brody/index.js';

test('Brody adapter initializes with valid configuration', () => {
  assert.equal(brody.id, 'brody');
  assert.equal(brody.teryt, '0811034');
  assert.equal(brody.label, 'Brody');
  assert.equal(brody.voivodeship, 'lubuskie');
  assert.equal(typeof brody.crawlActive, 'function');
  assert.equal(typeof brody.crawlResults, 'function');
});
