import test from 'node:test';
import assert from 'node:assert/strict';
import sokolowPodlaski from '../src/cities/sokolow-podlaski/index.js';

test('Sokołów Podlaski adapter initializes with valid configuration', () => {
  assert.equal(sokolowPodlaski.id, 'sokolow-podlaski');
  assert.equal(sokolowPodlaski.teryt, '1429011');
  assert.equal(sokolowPodlaski.label, 'Sokołów Podlaski');
  assert.equal(sokolowPodlaski.voivodeship, 'mazowieckie');
  assert.equal(typeof sokolowPodlaski.crawlActive, 'function');
  assert.equal(typeof sokolowPodlaski.crawlResults, 'function');
});
