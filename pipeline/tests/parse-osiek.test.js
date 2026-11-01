import test from 'node:test';
import assert from 'node:assert/strict';
import osiek from '../src/cities/osiek/index.js';

test('Osiek adapter initializes with valid configuration', () => {
  assert.equal(osiek.id, 'osiek');
  assert.equal(osiek.teryt, '2612044');
  assert.equal(osiek.label, 'Osiek');
  assert.equal(osiek.voivodeship, 'swietokrzyskie');
  assert.equal(typeof osiek.crawlActive, 'function');
  assert.equal(typeof osiek.crawlResults, 'function');
});
