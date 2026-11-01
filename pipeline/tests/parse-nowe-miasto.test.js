import test from 'node:test';
import assert from 'node:assert/strict';
import noweMiasto from '../src/cities/nowe-miasto/index.js';

test('Nowe Miasto adapter initializes with valid configuration', () => {
  assert.equal(noweMiasto.id, 'nowe-miasto');
  assert.equal(noweMiasto.teryt, '1420084');
  assert.equal(noweMiasto.label, 'Nowe Miasto');
  assert.equal(noweMiasto.voivodeship, 'mazowieckie');
  assert.equal(typeof noweMiasto.crawlActive, 'function');
  assert.equal(typeof noweMiasto.crawlResults, 'function');
});
