import test from 'node:test';
import assert from 'node:assert/strict';
import mszanaDolna from '../src/cities/mszana-dolna/index.js';

test('Mszana Dolna adapter initializes with valid configuration', () => {
  assert.equal(mszanaDolna.id, 'mszana-dolna');
  assert.equal(mszanaDolna.teryt, '1207021');
  assert.equal(mszanaDolna.label, 'Mszana Dolna');
  assert.equal(mszanaDolna.voivodeship, 'malopolskie');
  assert.equal(typeof mszanaDolna.crawlActive, 'function');
  assert.equal(typeof mszanaDolna.crawlResults, 'function');
});
