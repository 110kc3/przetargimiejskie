import test from 'node:test';
import assert from 'node:assert/strict';
import tulowice from '../src/cities/tulowice/index.js';

test('Tułowice adapter initializes with valid configuration', () => {
  assert.equal(tulowice.id, 'tulowice');
  assert.equal(tulowice.teryt, '1609124');
  assert.equal(tulowice.label, 'Tułowice');
  assert.equal(tulowice.voivodeship, 'opolskie');
  assert.equal(typeof tulowice.crawlActive, 'function');
  assert.equal(typeof tulowice.crawlResults, 'function');
});
