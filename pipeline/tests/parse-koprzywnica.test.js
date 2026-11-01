import test from 'node:test';
import assert from 'node:assert/strict';
import koprzywnica from '../src/cities/koprzywnica/index.js';

test('Koprzywnica adapter initializes with valid configuration', () => {
  assert.equal(koprzywnica.id, 'koprzywnica');
  assert.equal(koprzywnica.teryt, '2609044');
  assert.equal(koprzywnica.label, 'Koprzywnica');
  assert.equal(koprzywnica.voivodeship, 'swietokrzyskie');
  assert.equal(typeof koprzywnica.crawlActive, 'function');
  assert.equal(typeof koprzywnica.crawlResults, 'function');
});
