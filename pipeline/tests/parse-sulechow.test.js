import test from 'node:test';
import assert from 'node:assert/strict';
import sulechow from '../src/cities/sulechow/index.js';

test('Sulechów adapter initializes with valid configuration', () => {
  assert.equal(sulechow.id, 'sulechow');
  assert.equal(sulechow.teryt, '0809064');
  assert.equal(sulechow.label, 'Sulechów');
  assert.equal(sulechow.voivodeship, 'lubuskie');
  assert.equal(typeof sulechow.crawlActive, 'function');
  assert.equal(typeof sulechow.crawlResults, 'function');
});
