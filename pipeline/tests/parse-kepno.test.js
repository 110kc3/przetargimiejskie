import test from 'node:test';
import assert from 'node:assert/strict';
import kepno from '../src/cities/kepno/index.js';

test('Kępno adapter initializes with valid configuration', () => {
  assert.equal(kepno.id, 'kepno');
  assert.equal(kepno.teryt, '3008034');
  assert.equal(kepno.label, 'Kępno');
  assert.equal(kepno.voivodeship, 'wielkopolskie');
  assert.equal(typeof kepno.crawlActive, 'function');
  assert.equal(typeof kepno.crawlResults, 'function');
});
