import test from 'node:test';
import assert from 'node:assert/strict';
import kcynia from '../src/cities/kcynia/index.js';

test('Kcynia adapter initializes with valid configuration', () => {
  assert.equal(kcynia.id, 'kcynia');
  assert.equal(kcynia.teryt, '0410014');
  assert.equal(kcynia.label, 'Kcynia');
  assert.equal(kcynia.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof kcynia.crawlActive, 'function');
  assert.equal(typeof kcynia.crawlResults, 'function');
});
