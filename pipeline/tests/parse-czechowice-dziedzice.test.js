import test from 'node:test';
import assert from 'node:assert/strict';
import czechowiceDziedzice from '../src/cities/czechowice-dziedzice/index.js';

test('Czechowice-Dziedzice adapter initializes with valid configuration', () => {
  assert.equal(czechowiceDziedzice.id, 'czechowice-dziedzice');
  assert.equal(czechowiceDziedzice.teryt, '2402044');
  assert.equal(czechowiceDziedzice.label, 'Czechowice-Dziedzice');
  assert.equal(czechowiceDziedzice.voivodeship, 'slaskie');
  assert.equal(typeof czechowiceDziedzice.crawlActive, 'function');
  assert.equal(typeof czechowiceDziedzice.crawlResults, 'function');
});
