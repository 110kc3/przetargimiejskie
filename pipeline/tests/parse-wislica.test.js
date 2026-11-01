import test from 'node:test';
import assert from 'node:assert/strict';
import wislica from '../src/cities/wislica/index.js';

test('Wiślica adapter initializes with valid configuration', () => {
  assert.equal(wislica.id, 'wislica');
  assert.equal(wislica.teryt, '2601084');
  assert.equal(wislica.label, 'Wiślica');
  assert.equal(wislica.voivodeship, 'swietokrzyskie');
  assert.equal(typeof wislica.crawlActive, 'function');
  assert.equal(typeof wislica.crawlResults, 'function');
});
