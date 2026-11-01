import test from 'node:test';
import assert from 'node:assert/strict';
import ulanow from '../src/cities/ulanow/index.js';

test('Ulanów adapter initializes with valid configuration', () => {
  assert.equal(ulanow.id, 'ulanow');
  assert.equal(ulanow.teryt, '1812074');
  assert.equal(ulanow.label, 'Ulanów');
  assert.equal(ulanow.voivodeship, 'podkarpackie');
  assert.equal(typeof ulanow.crawlActive, 'function');
  assert.equal(typeof ulanow.crawlResults, 'function');
});
