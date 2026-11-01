import test from 'node:test';
import assert from 'node:assert/strict';
import kozuchow from '../src/cities/kozuchow/index.js';

test('Kożuchów adapter initializes with valid configuration', () => {
  assert.equal(kozuchow.id, 'kozuchow');
  assert.equal(kozuchow.teryt, '0804044');
  assert.equal(kozuchow.label, 'Kożuchów');
  assert.equal(kozuchow.voivodeship, 'lubuskie');
  assert.equal(typeof kozuchow.crawlActive, 'function');
  assert.equal(typeof kozuchow.crawlResults, 'function');
});
