import test from 'node:test';
import assert from 'node:assert/strict';
import mieroszow from '../src/cities/mieroszow/index.js';

test('Mieroszów adapter initializes with valid configuration', () => {
  assert.equal(mieroszow.id, 'mieroszow');
  assert.equal(mieroszow.teryt, '0221064');
  assert.equal(mieroszow.label, 'Mieroszów');
  assert.equal(mieroszow.voivodeship, 'dolnoslaskie');
  assert.equal(typeof mieroszow.crawlActive, 'function');
  assert.equal(typeof mieroszow.crawlResults, 'function');
});
