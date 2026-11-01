import test from 'node:test';
import assert from 'node:assert/strict';
import noweMiastoLubawskie from '../src/cities/nowe-miasto-lubawskie/index.js';

test('Nowe Miasto Lubawskie adapter initializes with valid configuration', () => {
  assert.equal(noweMiastoLubawskie.id, 'nowe-miasto-lubawskie');
  assert.equal(noweMiastoLubawskie.teryt, '2812011');
  assert.equal(noweMiastoLubawskie.label, 'Nowe Miasto Lubawskie');
  assert.equal(noweMiastoLubawskie.voivodeship, 'warminsko-mazurskie');
  assert.equal(typeof noweMiastoLubawskie.crawlActive, 'function');
  assert.equal(typeof noweMiastoLubawskie.crawlResults, 'function');
});
