import test from 'node:test';
import assert from 'node:assert/strict';
import kobylnica from '../src/cities/kobylnica/index.js';

test('Kobylnica adapter initializes with valid configuration', () => {
  assert.equal(kobylnica.id, 'kobylnica');
  assert.equal(kobylnica.teryt, '2212064');
  assert.equal(kobylnica.label, 'Kobylnica');
  assert.equal(kobylnica.voivodeship, 'pomorskie');
  assert.equal(typeof kobylnica.crawlActive, 'function');
  assert.equal(typeof kobylnica.crawlResults, 'function');
});
