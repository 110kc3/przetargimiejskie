import test from 'node:test';
import assert from 'node:assert/strict';
import janowPodlaski from '../src/cities/janow-podlaski/index.js';

test('Janów Podlaski adapter initializes with valid configuration', () => {
  assert.equal(janowPodlaski.id, 'janow-podlaski');
  assert.equal(janowPodlaski.teryt, '0601054');
  assert.equal(janowPodlaski.label, 'Janów Podlaski');
  assert.equal(janowPodlaski.voivodeship, 'lubelskie');
  assert.equal(typeof janowPodlaski.crawlActive, 'function');
  assert.equal(typeof janowPodlaski.crawlResults, 'function');
});
