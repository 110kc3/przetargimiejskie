import test from 'node:test';
import assert from 'node:assert/strict';
import twardogora from '../src/cities/twardogora/index.js';

test('Twardogóra adapter initializes with valid configuration', () => {
  assert.equal(twardogora.id, 'twardogora');
  assert.equal(twardogora.teryt, '0214084');
  assert.equal(twardogora.label, 'Twardogóra');
  assert.equal(twardogora.voivodeship, 'dolnoslaskie');
  assert.equal(typeof twardogora.crawlActive, 'function');
  assert.equal(typeof twardogora.crawlResults, 'function');
});
