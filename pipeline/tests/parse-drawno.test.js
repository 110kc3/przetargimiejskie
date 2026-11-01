import test from 'node:test';
import assert from 'node:assert/strict';
import drawno from '../src/cities/drawno/index.js';

test('Drawno adapter initializes with valid configuration', () => {
  assert.equal(drawno.id, 'drawno');
  assert.equal(drawno.teryt, '3202034');
  assert.equal(drawno.label, 'Drawno');
  assert.equal(drawno.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof drawno.crawlActive, 'function');
  assert.equal(typeof drawno.crawlResults, 'function');
});
