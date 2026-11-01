import test from 'node:test';
import assert from 'node:assert/strict';
import bolkow from '../src/cities/bolkow/index.js';

test('Bolków adapter initializes with valid configuration', () => {
  assert.equal(bolkow.id, 'bolkow');
  assert.equal(bolkow.teryt, '0205024');
  assert.equal(bolkow.label, 'Bolków');
  assert.equal(bolkow.voivodeship, 'dolnoslaskie');
  assert.equal(typeof bolkow.crawlActive, 'function');
  assert.equal(typeof bolkow.crawlResults, 'function');
});
