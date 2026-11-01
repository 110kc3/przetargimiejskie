import test from 'node:test';
import assert from 'node:assert/strict';
import sulejow from '../src/cities/sulejow/index.js';

test('Sulejów adapter initializes with valid configuration', () => {
  assert.equal(sulejow.id, 'sulejow');
  assert.equal(sulejow.teryt, '1010094');
  assert.equal(sulejow.label, 'Sulejów');
  assert.equal(sulejow.voivodeship, 'lodzkie');
  assert.equal(typeof sulejow.crawlActive, 'function');
  assert.equal(typeof sulejow.crawlResults, 'function');
});
