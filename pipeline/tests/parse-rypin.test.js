import test from 'node:test';
import assert from 'node:assert/strict';
import rypin from '../src/cities/rypin/index.js';

test('Rypin adapter initializes with valid configuration', () => {
  assert.equal(rypin.id, 'rypin');
  assert.equal(rypin.teryt, '0412011');
  assert.equal(rypin.label, 'Rypin');
  assert.equal(rypin.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof rypin.crawlActive, 'function');
  assert.equal(typeof rypin.crawlResults, 'function');
});
