import test from 'node:test';
import assert from 'node:assert/strict';
import konstancinJeziorna from '../src/cities/konstancin-jeziorna/index.js';

test('Konstancin-Jeziorna adapter initializes with valid configuration', () => {
  assert.equal(konstancinJeziorna.id, 'konstancin-jeziorna');
  assert.equal(konstancinJeziorna.teryt, '1418024');
  assert.equal(konstancinJeziorna.label, 'Konstancin-Jeziorna');
  assert.equal(konstancinJeziorna.voivodeship, 'mazowieckie');
  assert.equal(typeof konstancinJeziorna.crawlActive, 'function');
  assert.equal(typeof konstancinJeziorna.crawlResults, 'function');
});
