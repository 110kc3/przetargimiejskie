import test from 'node:test';
import assert from 'node:assert/strict';
import bogatynia from '../src/cities/bogatynia/index.js';

test('Bogatynia adapter initializes with valid configuration', () => {
  assert.equal(bogatynia.id, 'bogatynia');
  assert.equal(bogatynia.teryt, '0225034');
  assert.equal(bogatynia.label, 'Bogatynia');
  assert.equal(bogatynia.voivodeship, 'dolnoslaskie');
  assert.equal(typeof bogatynia.crawlActive, 'function');
  assert.equal(typeof bogatynia.crawlResults, 'function');
});
