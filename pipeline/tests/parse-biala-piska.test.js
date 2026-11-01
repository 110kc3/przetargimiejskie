import test from 'node:test';
import assert from 'node:assert/strict';
import bialaPiska from '../src/cities/biala-piska/index.js';

test('Biała Piska adapter initializes with valid configuration', () => {
  assert.equal(bialaPiska.id, 'biala-piska');
  assert.equal(bialaPiska.teryt, '2816014');
  assert.equal(bialaPiska.label, 'Biała Piska');
  assert.equal(bialaPiska.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof bialaPiska.crawlActive, 'function');
  assert.equal(typeof bialaPiska.crawlResults, 'function');
});
