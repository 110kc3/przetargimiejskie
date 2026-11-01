import test from 'node:test';
import assert from 'node:assert/strict';
import radzionkow from '../src/cities/radzionkow/index.js';

test('Radzionków adapter initializes with valid configuration', () => {
  assert.equal(radzionkow.id, 'radzionkow');
  assert.equal(radzionkow.teryt, '2413031');
  assert.equal(radzionkow.label, 'Radzionków');
  assert.equal(radzionkow.voivodeship, 'slaskie');
  assert.equal(typeof radzionkow.crawlActive, 'function');
  assert.equal(typeof radzionkow.crawlResults, 'function');
});
