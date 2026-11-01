import test from 'node:test';
import assert from 'node:assert/strict';
import golczewo from '../src/cities/golczewo/index.js';

test('Golczewo adapter initializes with valid configuration', () => {
  assert.equal(golczewo.id, 'golczewo');
  assert.equal(golczewo.teryt, '3207024');
  assert.equal(golczewo.label, 'Golczewo');
  assert.equal(golczewo.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof golczewo.crawlActive, 'function');
  assert.equal(typeof golczewo.crawlResults, 'function');
});
