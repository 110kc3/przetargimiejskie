import test from 'node:test';
import assert from 'node:assert/strict';
import sedziszow from '../src/cities/sedziszow/index.js';

test('Sędziszów adapter initializes with valid configuration', () => {
  assert.equal(sedziszow.id, 'sedziszow');
  assert.equal(sedziszow.teryt, '2602064');
  assert.equal(sedziszow.label, 'Sędziszów');
  assert.equal(sedziszow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof sedziszow.crawlActive, 'function');
  assert.equal(typeof sedziszow.crawlResults, 'function');
});
