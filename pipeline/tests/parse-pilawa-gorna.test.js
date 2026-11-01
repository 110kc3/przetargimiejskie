import test from 'node:test';
import assert from 'node:assert/strict';
import pilawaGorna from '../src/cities/pilawa-gorna/index.js';

test('Piława Górna adapter initializes with valid configuration', () => {
  assert.equal(pilawaGorna.id, 'pilawa-gorna');
  assert.equal(pilawaGorna.teryt, '0202041');
  assert.equal(pilawaGorna.label, 'Piława Górna');
  assert.equal(pilawaGorna.voivodeship, 'dolnoslaskie');
  assert.equal(typeof pilawaGorna.crawlActive, 'function');
  assert.equal(typeof pilawaGorna.crawlResults, 'function');
});
