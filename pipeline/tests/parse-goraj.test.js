import test from 'node:test';
import assert from 'node:assert/strict';
import goraj from '../src/cities/goraj/index.js';

test('Goraj adapter initializes with valid configuration', () => {
  assert.equal(goraj.id, 'goraj');
  assert.equal(goraj.teryt, '0602064');
  assert.equal(goraj.label, 'Goraj');
  assert.equal(goraj.voivodeship, 'lubelskie');
  assert.equal(typeof goraj.crawlActive, 'function');
  assert.equal(typeof goraj.crawlResults, 'function');
});
