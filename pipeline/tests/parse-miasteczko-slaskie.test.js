import test from 'node:test';
import assert from 'node:assert/strict';
import miasteczkoSlaskie from '../src/cities/miasteczko-slaskie/index.js';

test('Miasteczko Śląskie adapter initializes with valid configuration', () => {
  assert.equal(miasteczkoSlaskie.id, 'miasteczko-slaskie');
  assert.equal(miasteczkoSlaskie.teryt, '2413021');
  assert.equal(miasteczkoSlaskie.label, 'Miasteczko Śląskie');
  assert.equal(miasteczkoSlaskie.voivodeship, 'slaskie');
  assert.equal(typeof miasteczkoSlaskie.crawlActive, 'function');
  assert.equal(typeof miasteczkoSlaskie.crawlResults, 'function');
});
