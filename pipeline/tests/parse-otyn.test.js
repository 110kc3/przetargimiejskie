import test from 'node:test';
import assert from 'node:assert/strict';
import otyn from '../src/cities/otyn/index.js';

test('Otyń adapter initializes with valid configuration', () => {
  assert.equal(otyn.id, 'otyn');
  assert.equal(otyn.teryt, '0804074');
  assert.equal(otyn.label, 'Otyń');
  assert.equal(otyn.voivodeship, 'lubuskie');
  assert.equal(typeof otyn.crawlActive, 'function');
  assert.equal(typeof otyn.crawlResults, 'function');
});
