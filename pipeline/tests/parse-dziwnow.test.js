import test from 'node:test';
import assert from 'node:assert/strict';
import dziwnow from '../src/cities/dziwnow/index.js';

test('Dziwnów adapter initializes with valid configuration', () => {
  assert.equal(dziwnow.id, 'dziwnow');
  assert.equal(dziwnow.teryt, '3207014');
  assert.equal(dziwnow.label, 'Dziwnów');
  assert.equal(dziwnow.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof dziwnow.crawlActive, 'function');
  assert.equal(typeof dziwnow.crawlResults, 'function');
});
