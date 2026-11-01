import test from 'node:test';
import assert from 'node:assert/strict';
import piekoszow from '../src/cities/piekoszow/index.js';

test('Piekoszów adapter initializes with valid configuration', () => {
  assert.equal(piekoszow.id, 'piekoszow');
  assert.equal(piekoszow.teryt, '2604144');
  assert.equal(piekoszow.label, 'Piekoszów');
  assert.equal(piekoszow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof piekoszow.crawlActive, 'function');
  assert.equal(typeof piekoszow.crawlResults, 'function');
});
