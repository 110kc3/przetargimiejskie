import test from 'node:test';
import assert from 'node:assert/strict';
import stepnica from '../src/cities/stepnica/index.js';

test('Stepnica adapter initializes with valid configuration', () => {
  assert.equal(stepnica.id, 'stepnica');
  assert.equal(stepnica.teryt, '3204074');
  assert.equal(stepnica.label, 'Stepnica');
  assert.equal(stepnica.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof stepnica.crawlActive, 'function');
  assert.equal(typeof stepnica.crawlResults, 'function');
});
