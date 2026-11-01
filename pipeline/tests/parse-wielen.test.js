import test from 'node:test';
import assert from 'node:assert/strict';
import wielen from '../src/cities/wielen/index.js';

test('Wieleń adapter initializes with valid configuration', () => {
  assert.equal(wielen.id, 'wielen');
  assert.equal(wielen.teryt, '3002084');
  assert.equal(wielen.label, 'Wieleń');
  assert.equal(wielen.voivodeship, 'wielkopolskie');
  assert.equal(typeof wielen.crawlActive, 'function');
  assert.equal(typeof wielen.crawlResults, 'function');
});
