import test from 'node:test';
import assert from 'node:assert/strict';
import drohiczyn from '../src/cities/drohiczyn/index.js';

test('Drohiczyn adapter initializes with valid configuration', () => {
  assert.equal(drohiczyn.id, 'drohiczyn');
  assert.equal(drohiczyn.teryt, '2010024');
  assert.equal(drohiczyn.label, 'Drohiczyn');
  assert.equal(drohiczyn.voivodeship, 'podlaskie');
  assert.equal(typeof drohiczyn.crawlActive, 'function');
  assert.equal(typeof drohiczyn.crawlResults, 'function');
});
