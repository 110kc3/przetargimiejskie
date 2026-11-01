import test from 'node:test';
import assert from 'node:assert/strict';
import mysliborz from '../src/cities/mysliborz/index.js';

test('Myślibórz adapter initializes with valid configuration', () => {
  assert.equal(mysliborz.id, 'mysliborz');
  assert.equal(mysliborz.teryt, '3210044');
  assert.equal(mysliborz.label, 'Myślibórz');
  assert.equal(mysliborz.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof mysliborz.crawlActive, 'function');
  assert.equal(typeof mysliborz.crawlResults, 'function');
});
