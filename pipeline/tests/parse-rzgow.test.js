import test from 'node:test';
import assert from 'node:assert/strict';
import rzgow from '../src/cities/rzgow/index.js';

test('Rzgów adapter initializes with valid configuration', () => {
  assert.equal(rzgow.id, 'rzgow');
  assert.equal(rzgow.teryt, '1006104');
  assert.equal(rzgow.label, 'Rzgów');
  assert.equal(rzgow.voivodeship, 'lodzkie');
  assert.equal(typeof rzgow.crawlActive, 'function');
  assert.equal(typeof rzgow.crawlResults, 'function');
});
