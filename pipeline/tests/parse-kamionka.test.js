import test from 'node:test';
import assert from 'node:assert/strict';
import kamionka from '../src/cities/kamionka/index.js';

test('Kamionka adapter initializes with valid configuration', () => {
  assert.equal(kamionka.id, 'kamionka');
  assert.equal(kamionka.teryt, '0608054');
  assert.equal(kamionka.label, 'Kamionka');
  assert.equal(kamionka.voivodeship, 'lubelskie');
  assert.equal(typeof kamionka.crawlActive, 'function');
  assert.equal(typeof kamionka.crawlResults, 'function');
});
