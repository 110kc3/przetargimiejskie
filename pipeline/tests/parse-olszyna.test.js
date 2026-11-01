import test from 'node:test';
import assert from 'node:assert/strict';
import olszyna from '../src/cities/olszyna/index.js';

test('Olszyna adapter initializes with valid configuration', () => {
  assert.equal(olszyna.id, 'olszyna');
  assert.equal(olszyna.teryt, '0210054');
  assert.equal(olszyna.label, 'Olszyna');
  assert.equal(olszyna.voivodeship, 'dolnoslaskie');
  assert.equal(typeof olszyna.crawlActive, 'function');
  assert.equal(typeof olszyna.crawlResults, 'function');
});
