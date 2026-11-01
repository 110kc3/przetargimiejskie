import test from 'node:test';
import assert from 'node:assert/strict';
import slawno from '../src/cities/slawno/index.js';

test('Sławno adapter initializes with valid configuration', () => {
  assert.equal(slawno.id, 'slawno');
  assert.equal(slawno.teryt, '3213021');
  assert.equal(slawno.label, 'Sławno');
  assert.equal(slawno.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof slawno.crawlActive, 'function');
  assert.equal(typeof slawno.crawlResults, 'function');
});
