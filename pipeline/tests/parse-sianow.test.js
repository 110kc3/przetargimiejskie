import test from 'node:test';
import assert from 'node:assert/strict';
import sianow from '../src/cities/sianow/index.js';

test('Sianów adapter initializes with valid configuration', () => {
  assert.equal(sianow.id, 'sianow');
  assert.equal(sianow.teryt, '3209074');
  assert.equal(sianow.label, 'Sianów');
  assert.equal(sianow.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof sianow.crawlActive, 'function');
  assert.equal(typeof sianow.crawlResults, 'function');
});
