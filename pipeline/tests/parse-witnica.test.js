import test from 'node:test';
import assert from 'node:assert/strict';
import witnica from '../src/cities/witnica/index.js';

test('Witnica adapter initializes with valid configuration', () => {
  assert.equal(witnica.id, 'witnica');
  assert.equal(witnica.teryt, '0801074');
  assert.equal(witnica.label, 'Witnica');
  assert.equal(witnica.voivodeship, 'lubuskie');
  assert.equal(typeof witnica.crawlActive, 'function');
  assert.equal(typeof witnica.crawlResults, 'function');
});
