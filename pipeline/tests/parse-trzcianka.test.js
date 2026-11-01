import test from 'node:test';
import assert from 'node:assert/strict';
import trzcianka from '../src/cities/trzcianka/index.js';

test('Trzcianka adapter initializes with valid configuration', () => {
  assert.equal(trzcianka.id, 'trzcianka');
  assert.equal(trzcianka.teryt, '3002074');
  assert.equal(trzcianka.label, 'Trzcianka');
  assert.equal(trzcianka.voivodeship, 'wielkopolskie');
  assert.equal(typeof trzcianka.crawlActive, 'function');
  assert.equal(typeof trzcianka.crawlResults, 'function');
});
