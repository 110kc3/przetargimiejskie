import test from 'node:test';
import assert from 'node:assert/strict';
import pobiedziska from '../src/cities/pobiedziska/index.js';

test('Pobiedziska adapter initializes with valid configuration', () => {
  assert.equal(pobiedziska.id, 'pobiedziska');
  assert.equal(pobiedziska.teryt, '3021124');
  assert.equal(pobiedziska.label, 'Pobiedziska');
  assert.equal(pobiedziska.voivodeship, 'wielkopolskie');
  assert.equal(typeof pobiedziska.crawlActive, 'function');
  assert.equal(typeof pobiedziska.crawlResults, 'function');
});
