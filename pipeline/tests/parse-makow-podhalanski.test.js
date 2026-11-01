import test from 'node:test';
import assert from 'node:assert/strict';
import makowPodhalanski from '../src/cities/makow-podhalanski/index.js';

test('Maków Podhalański adapter initializes with valid configuration', () => {
  assert.equal(makowPodhalanski.id, 'makow-podhalanski');
  assert.equal(makowPodhalanski.teryt, '1215064');
  assert.equal(makowPodhalanski.label, 'Maków Podhalański');
  assert.equal(makowPodhalanski.voivodeship, 'malopolskie');
  assert.equal(typeof makowPodhalanski.crawlActive, 'function');
  assert.equal(typeof makowPodhalanski.crawlResults, 'function');
});
