import test from 'node:test';
import assert from 'node:assert/strict';
import lewinBrzeski from '../src/cities/lewin-brzeski/index.js';

test('Lewin Brzeski adapter initializes with valid configuration', () => {
  assert.equal(lewinBrzeski.id, 'lewin-brzeski');
  assert.equal(lewinBrzeski.teryt, '1601044');
  assert.equal(lewinBrzeski.label, 'Lewin Brzeski');
  assert.equal(lewinBrzeski.voivodeship, 'opolskie');
  assert.equal(typeof lewinBrzeski.crawlActive, 'function');
  assert.equal(typeof lewinBrzeski.crawlResults, 'function');
});
