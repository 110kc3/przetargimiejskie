import test from 'node:test';
import assert from 'node:assert/strict';
import naleczow from '../src/cities/naleczow/index.js';

test('Nałęczów adapter initializes with valid configuration', () => {
  assert.equal(naleczow.id, 'naleczow');
  assert.equal(naleczow.teryt, '0614084');
  assert.equal(naleczow.label, 'Nałęczów');
  assert.equal(naleczow.voivodeship, 'lubelskie');
  assert.equal(typeof naleczow.crawlActive, 'function');
  assert.equal(typeof naleczow.crawlResults, 'function');
});
