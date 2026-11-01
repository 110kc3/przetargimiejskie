import test from 'node:test';
import assert from 'node:assert/strict';
import sobotka from '../src/cities/sobotka/index.js';

test('Sobótka adapter initializes with valid configuration', () => {
  assert.equal(sobotka.id, 'sobotka');
  assert.equal(sobotka.teryt, '0223074');
  assert.equal(sobotka.label, 'Sobótka');
  assert.equal(sobotka.voivodeship, 'dolnoslaskie');
  assert.equal(typeof sobotka.crawlActive, 'function');
  assert.equal(typeof sobotka.crawlResults, 'function');
});
