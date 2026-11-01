import test from 'node:test';
import assert from 'node:assert/strict';
import kamienKrajenski from '../src/cities/kamien-krajenski/index.js';

test('Kamień Krajeński adapter initializes with valid configuration', () => {
  assert.equal(kamienKrajenski.id, 'kamien-krajenski');
  assert.equal(kamienKrajenski.teryt, '0413014');
  assert.equal(kamienKrajenski.label, 'Kamień Krajeński');
  assert.equal(kamienKrajenski.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof kamienKrajenski.crawlActive, 'function');
  assert.equal(typeof kamienKrajenski.crawlResults, 'function');
});
