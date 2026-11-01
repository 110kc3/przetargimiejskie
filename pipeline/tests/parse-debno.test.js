import test from 'node:test';
import assert from 'node:assert/strict';
import debno from '../src/cities/debno/index.js';

test('Dębno adapter initializes with valid configuration', () => {
  assert.equal(debno.id, 'debno');
  assert.equal(debno.teryt, '3210034');
  assert.equal(debno.label, 'Dębno');
  assert.equal(debno.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof debno.crawlActive, 'function');
  assert.equal(typeof debno.crawlResults, 'function');
});
