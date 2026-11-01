import test from 'node:test';
import assert from 'node:assert/strict';
import wielichowo from '../src/cities/wielichowo/index.js';

test('Wielichowo adapter initializes with valid configuration', () => {
  assert.equal(wielichowo.id, 'wielichowo');
  assert.equal(wielichowo.teryt, '3005054');
  assert.equal(wielichowo.label, 'Wielichowo');
  assert.equal(wielichowo.voivodeship, 'wielkopolskie');
  assert.equal(typeof wielichowo.crawlActive, 'function');
  assert.equal(typeof wielichowo.crawlResults, 'function');
});
