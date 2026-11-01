import test from 'node:test';
import assert from 'node:assert/strict';
import bierutow from '../src/cities/bierutow/index.js';

test('Bierutów adapter initializes with valid configuration', () => {
  assert.equal(bierutow.id, 'bierutow');
  assert.equal(bierutow.teryt, '0214024');
  assert.equal(bierutow.label, 'Bierutów');
  assert.equal(bierutow.voivodeship, 'dolnoslaskie');
  assert.equal(typeof bierutow.crawlActive, 'function');
  assert.equal(typeof bierutow.crawlResults, 'function');
});
