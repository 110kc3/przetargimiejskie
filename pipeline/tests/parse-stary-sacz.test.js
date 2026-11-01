import test from 'node:test';
import assert from 'node:assert/strict';
import starySacz from '../src/cities/stary-sacz/index.js';

test('Stary Sącz adapter initializes with valid configuration', () => {
  assert.equal(starySacz.id, 'stary-sacz');
  assert.equal(starySacz.teryt, '1210164');
  assert.equal(starySacz.label, 'Stary Sącz');
  assert.equal(starySacz.voivodeship, 'malopolskie');
  assert.equal(typeof starySacz.crawlActive, 'function');
  assert.equal(typeof starySacz.crawlResults, 'function');
});
