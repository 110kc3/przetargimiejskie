import test from 'node:test';
import assert from 'node:assert/strict';
import smigiel from '../src/cities/smigiel/index.js';

test('Śmigiel adapter initializes with valid configuration', () => {
  assert.equal(smigiel.id, 'smigiel');
  assert.equal(smigiel.teryt, '3011054');
  assert.equal(smigiel.label, 'Śmigiel');
  assert.equal(smigiel.voivodeship, 'wielkopolskie');
  assert.equal(typeof smigiel.crawlActive, 'function');
  assert.equal(typeof smigiel.crawlResults, 'function');
});
