import test from 'node:test';
import assert from 'node:assert/strict';
import tuliszkow from '../src/cities/tuliszkow/index.js';

test('Tuliszków adapter initializes with valid configuration', () => {
  assert.equal(tuliszkow.id, 'tuliszkow');
  assert.equal(tuliszkow.teryt, '3027074');
  assert.equal(tuliszkow.label, 'Tuliszków');
  assert.equal(tuliszkow.voivodeship, 'wielkopolskie');
  assert.equal(typeof tuliszkow.crawlActive, 'function');
  assert.equal(typeof tuliszkow.crawlResults, 'function');
});
