import test from 'node:test';
import assert from 'node:assert/strict';
import konskowola from '../src/cities/konskowola/index.js';

test('Końskowola adapter initializes with valid configuration', () => {
  assert.equal(konskowola.id, 'konskowola');
  assert.equal(konskowola.teryt, '0614054');
  assert.equal(konskowola.label, 'Końskowola');
  assert.equal(konskowola.voivodeship, 'lubelskie');
  assert.equal(typeof konskowola.crawlActive, 'function');
  assert.equal(typeof konskowola.crawlResults, 'function');
});
