import test from 'node:test';
import assert from 'node:assert/strict';
import lagow from '../src/cities/lagow/index.js';

test('Łagów adapter initializes with valid configuration', () => {
  assert.equal(lagow.id, 'lagow');
  assert.equal(lagow.teryt, '2604074');
  assert.equal(lagow.label, 'Łagów');
  assert.equal(lagow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof lagow.crawlActive, 'function');
  assert.equal(typeof lagow.crawlResults, 'function');
});
