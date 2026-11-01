import test from 'node:test';
import assert from 'node:assert/strict';
import szepietowo from '../src/cities/szepietowo/index.js';

test('Szepietowo adapter initializes with valid configuration', () => {
  assert.equal(szepietowo.id, 'szepietowo');
  assert.equal(szepietowo.teryt, '2013094');
  assert.equal(szepietowo.label, 'Szepietowo');
  assert.equal(szepietowo.voivodeship, 'podlaskie');
  assert.equal(typeof szepietowo.crawlActive, 'function');
  assert.equal(typeof szepietowo.crawlResults, 'function');
});
