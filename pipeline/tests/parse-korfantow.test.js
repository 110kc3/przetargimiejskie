import test from 'node:test';
import assert from 'node:assert/strict';
import korfantow from '../src/cities/korfantow/index.js';

test('Korfantów adapter initializes with valid configuration', () => {
  assert.equal(korfantow.id, 'korfantow');
  assert.equal(korfantow.teryt, '1607034');
  assert.equal(korfantow.label, 'Korfantów');
  assert.equal(korfantow.voivodeship, 'opolskie');
  assert.equal(typeof korfantow.crawlActive, 'function');
  assert.equal(typeof korfantow.crawlResults, 'function');
});
