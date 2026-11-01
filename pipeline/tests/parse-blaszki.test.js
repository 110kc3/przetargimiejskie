import test from 'node:test';
import assert from 'node:assert/strict';
import blaszki from '../src/cities/blaszki/index.js';

test('Błaszki adapter initializes with valid configuration', () => {
  assert.equal(blaszki.id, 'blaszki');
  assert.equal(blaszki.teryt, '1014024');
  assert.equal(blaszki.label, 'Błaszki');
  assert.equal(blaszki.voivodeship, 'lodzkie');
  assert.equal(typeof blaszki.crawlActive, 'function');
  assert.equal(typeof blaszki.crawlResults, 'function');
});
