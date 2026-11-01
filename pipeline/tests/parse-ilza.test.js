import test from 'node:test';
import assert from 'node:assert/strict';
import ilza from '../src/cities/ilza/index.js';

test('Iłża adapter initializes with valid configuration', () => {
  assert.equal(ilza.id, 'ilza');
  assert.equal(ilza.teryt, '1425034');
  assert.equal(ilza.label, 'Iłża');
  assert.equal(ilza.voivodeship, 'mazowieckie');
  assert.equal(typeof ilza.crawlActive, 'function');
  assert.equal(typeof ilza.crawlResults, 'function');
});
