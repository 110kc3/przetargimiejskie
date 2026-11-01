import test from 'node:test';
import assert from 'node:assert/strict';
import opoleLubelskie from '../src/cities/opole-lubelskie/index.js';

test('Opole Lubelskie adapter initializes with valid configuration', () => {
  assert.equal(opoleLubelskie.id, 'opole-lubelskie');
  assert.equal(opoleLubelskie.teryt, '0612054');
  assert.equal(opoleLubelskie.label, 'Opole Lubelskie');
  assert.equal(opoleLubelskie.voivodeship, 'lubelskie');
  assert.equal(typeof opoleLubelskie.crawlActive, 'function');
  assert.equal(typeof opoleLubelskie.crawlResults, 'function');
});
