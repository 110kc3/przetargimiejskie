import test from 'node:test';
import assert from 'node:assert/strict';
import morawica from '../src/cities/morawica/index.js';

test('Morawica adapter initializes with valid configuration', () => {
  assert.equal(morawica.id, 'morawica');
  assert.equal(morawica.teryt, '2604124');
  assert.equal(morawica.label, 'Morawica');
  assert.equal(morawica.voivodeship, 'swietokrzyskie');
  assert.equal(typeof morawica.crawlActive, 'function');
  assert.equal(typeof morawica.crawlResults, 'function');
});
