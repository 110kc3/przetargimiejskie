import test from 'node:test';
import assert from 'node:assert/strict';
import leknica from '../src/cities/leknica/index.js';

test('Łęknica adapter initializes with valid configuration', () => {
  assert.equal(leknica.id, 'leknica');
  assert.equal(leknica.teryt, '0811011');
  assert.equal(leknica.label, 'Łęknica');
  assert.equal(leknica.voivodeship, 'lubuskie');
  assert.equal(typeof leknica.crawlActive, 'function');
  assert.equal(typeof leknica.crawlResults, 'function');
});
