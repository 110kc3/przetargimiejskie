import test from 'node:test';
import assert from 'node:assert/strict';
import jastrowie from '../src/cities/jastrowie/index.js';

test('Jastrowie adapter initializes with valid configuration', () => {
  assert.equal(jastrowie.id, 'jastrowie');
  assert.equal(jastrowie.teryt, '3031024');
  assert.equal(jastrowie.label, 'Jastrowie');
  assert.equal(jastrowie.voivodeship, 'wielkopolskie');
  assert.equal(typeof jastrowie.crawlActive, 'function');
  assert.equal(typeof jastrowie.crawlResults, 'function');
});
