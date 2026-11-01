import test from 'node:test';
import assert from 'node:assert/strict';
import ostrowiecSwietokrzyski from '../src/cities/ostrowiec-swietokrzyski/index.js';

test('Ostrowiec Świętokrzyski adapter initializes with valid configuration', () => {
  assert.equal(ostrowiecSwietokrzyski.id, 'ostrowiec-swietokrzyski');
  assert.equal(ostrowiecSwietokrzyski.teryt, '2607011');
  assert.equal(ostrowiecSwietokrzyski.label, 'Ostrowiec Świętokrzyski');
  assert.equal(ostrowiecSwietokrzyski.voivodeship, 'swietokrzyskie');
  assert.equal(typeof ostrowiecSwietokrzyski.crawlActive, 'function');
  assert.equal(typeof ostrowiecSwietokrzyski.crawlResults, 'function');
});
