import test from 'node:test';
import assert from 'node:assert/strict';
import przytyk from '../src/cities/przytyk/index.js';

test('Przytyk adapter initializes with valid configuration', () => {
  assert.equal(przytyk.id, 'przytyk');
  assert.equal(przytyk.teryt, '1425094');
  assert.equal(przytyk.label, 'Przytyk');
  assert.equal(przytyk.voivodeship, 'mazowieckie');
  assert.equal(typeof przytyk.crawlActive, 'function');
  assert.equal(typeof przytyk.crawlResults, 'function');
});
