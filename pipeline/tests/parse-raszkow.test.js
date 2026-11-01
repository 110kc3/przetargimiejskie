import test from 'node:test';
import assert from 'node:assert/strict';
import raszkow from '../src/cities/raszkow/index.js';

test('Raszków adapter initializes with valid configuration', () => {
  assert.equal(raszkow.id, 'raszkow');
  assert.equal(raszkow.teryt, '3017064');
  assert.equal(raszkow.label, 'Raszków');
  assert.equal(raszkow.voivodeship, 'wielkopolskie');
  assert.equal(typeof raszkow.crawlActive, 'function');
  assert.equal(typeof raszkow.crawlResults, 'function');
});
