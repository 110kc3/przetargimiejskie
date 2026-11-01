import test from 'node:test';
import assert from 'node:assert/strict';
import trzciel from '../src/cities/trzciel/index.js';

test('Trzciel adapter initializes with valid configuration', () => {
  assert.equal(trzciel.id, 'trzciel');
  assert.equal(trzciel.teryt, '0803064');
  assert.equal(trzciel.label, 'Trzciel');
  assert.equal(trzciel.voivodeship, 'lubuskie');
  assert.equal(typeof trzciel.crawlActive, 'function');
  assert.equal(typeof trzciel.crawlResults, 'function');
});
