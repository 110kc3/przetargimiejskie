import test from 'node:test';
import assert from 'node:assert/strict';
import lubienKujawski from '../src/cities/lubien-kujawski/index.js';

test('Lubień Kujawski adapter initializes with valid configuration', () => {
  assert.equal(lubienKujawski.id, 'lubien-kujawski');
  assert.equal(lubienKujawski.teryt, '0418114');
  assert.equal(lubienKujawski.label, 'Lubień Kujawski');
  assert.equal(lubienKujawski.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof lubienKujawski.crawlActive, 'function');
  assert.equal(typeof lubienKujawski.crawlResults, 'function');
});
