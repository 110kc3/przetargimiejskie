import test from 'node:test';
import assert from 'node:assert/strict';
import sieradz from '../src/cities/sieradz/index.js';

test('Sieradz adapter initializes with valid configuration', () => {
  assert.equal(sieradz.id, 'sieradz');
  assert.equal(sieradz.teryt, '1014011');
  assert.equal(sieradz.label, 'Sieradz');
  assert.equal(sieradz.voivodeship, 'lodzkie');
  assert.equal(typeof sieradz.crawlActive, 'function');
  assert.equal(typeof sieradz.crawlResults, 'function');
});
