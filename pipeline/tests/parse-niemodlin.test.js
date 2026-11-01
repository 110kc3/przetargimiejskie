import test from 'node:test';
import assert from 'node:assert/strict';
import niemodlin from '../src/cities/niemodlin/index.js';

test('Niemodlin adapter initializes with valid configuration', () => {
  assert.equal(niemodlin.id, 'niemodlin');
  assert.equal(niemodlin.teryt, '1609074');
  assert.equal(niemodlin.label, 'Niemodlin');
  assert.equal(niemodlin.voivodeship, 'opolskie');
  assert.equal(typeof niemodlin.crawlActive, 'function');
  assert.equal(typeof niemodlin.crawlResults, 'function');
});
