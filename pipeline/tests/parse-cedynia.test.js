import test from 'node:test';
import assert from 'node:assert/strict';
import cedynia from '../src/cities/cedynia/index.js';

test('Cedynia adapter initializes with valid configuration', () => {
  assert.equal(cedynia.id, 'cedynia');
  assert.equal(cedynia.teryt, '3206024');
  assert.equal(cedynia.label, 'Cedynia');
  assert.equal(cedynia.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof cedynia.crawlActive, 'function');
  assert.equal(typeof cedynia.crawlResults, 'function');
});
