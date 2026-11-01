import test from 'node:test';
import assert from 'node:assert/strict';
import kunow from '../src/cities/kunow/index.js';

test('Kunów adapter initializes with valid configuration', () => {
  assert.equal(kunow.id, 'kunow');
  assert.equal(kunow.teryt, '2607054');
  assert.equal(kunow.label, 'Kunów');
  assert.equal(kunow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof kunow.crawlActive, 'function');
  assert.equal(typeof kunow.crawlResults, 'function');
});
