import test from 'node:test';
import assert from 'node:assert/strict';
import krapkowice from '../src/cities/krapkowice/index.js';

test('Krapkowice adapter initializes with valid configuration', () => {
  assert.equal(krapkowice.id, 'krapkowice');
  assert.equal(krapkowice.teryt, '1605024');
  assert.equal(krapkowice.label, 'Krapkowice');
  assert.equal(krapkowice.voivodeship, 'opolskie');
  assert.equal(typeof krapkowice.crawlActive, 'function');
  assert.equal(typeof krapkowice.crawlResults, 'function');
});
