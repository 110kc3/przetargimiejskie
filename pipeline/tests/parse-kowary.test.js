import test from 'node:test';
import assert from 'node:assert/strict';
import kowary from '../src/cities/kowary/index.js';

test('Kowary adapter initializes with valid configuration', () => {
  assert.equal(kowary.id, 'kowary');
  assert.equal(kowary.teryt, '0206021');
  assert.equal(kowary.label, 'Kowary');
  assert.equal(kowary.voivodeship, 'dolnoslaskie');
  assert.equal(typeof kowary.crawlActive, 'function');
  assert.equal(typeof kowary.crawlResults, 'function');
});
