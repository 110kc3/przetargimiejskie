import test from 'node:test';
import assert from 'node:assert/strict';
import noweMiasteczko from '../src/cities/nowe-miasteczko/index.js';

test('Nowe Miasteczko adapter initializes with valid configuration', () => {
  assert.equal(noweMiasteczko.id, 'nowe-miasteczko');
  assert.equal(noweMiasteczko.teryt, '0804064');
  assert.equal(noweMiasteczko.label, 'Nowe Miasteczko');
  assert.equal(noweMiasteczko.voivodeship, 'lubuskie');
  assert.equal(typeof noweMiasteczko.crawlActive, 'function');
  assert.equal(typeof noweMiasteczko.crawlResults, 'function');
});
