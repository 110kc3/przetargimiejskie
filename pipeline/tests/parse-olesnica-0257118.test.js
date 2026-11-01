import test from 'node:test';
import assert from 'node:assert/strict';
import olesnica0257118 from '../src/cities/olesnica-0257118/index.js';

test('Oleśnica adapter initializes with valid configuration', () => {
  assert.equal(olesnica0257118.id, 'olesnica-0257118');
  assert.equal(olesnica0257118.teryt, '2612034');
  assert.equal(olesnica0257118.label, 'Oleśnica');
  assert.equal(olesnica0257118.voivodeship, 'swietokrzyskie');
  assert.equal(typeof olesnica0257118.crawlActive, 'function');
  assert.equal(typeof olesnica0257118.crawlResults, 'function');
});
