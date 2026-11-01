import test from 'node:test';
import assert from 'node:assert/strict';
import piwnicznaZdroj from '../src/cities/piwniczna-zdroj/index.js';

test('Piwniczna-Zdrój adapter initializes with valid configuration', () => {
  assert.equal(piwnicznaZdroj.id, 'piwniczna-zdroj');
  assert.equal(piwnicznaZdroj.teryt, '1210134');
  assert.equal(piwnicznaZdroj.label, 'Piwniczna-Zdrój');
  assert.equal(piwnicznaZdroj.voivodeship, 'malopolskie');
  assert.equal(typeof piwnicznaZdroj.crawlActive, 'function');
  assert.equal(typeof piwnicznaZdroj.crawlResults, 'function');
});
