import test from 'node:test';
import assert from 'node:assert/strict';
import gogolin from '../src/cities/gogolin/index.js';

test('Gogolin adapter initializes with valid configuration', () => {
  assert.equal(gogolin.id, 'gogolin');
  assert.equal(gogolin.teryt, '1605014');
  assert.equal(gogolin.label, 'Gogolin');
  assert.equal(gogolin.voivodeship, 'opolskie');
  assert.equal(typeof gogolin.crawlActive, 'function');
  assert.equal(typeof gogolin.crawlResults, 'function');
});
