import test from 'node:test';
import assert from 'node:assert/strict';
import glucholazy from '../src/cities/glucholazy/index.js';

test('Głuchołazy adapter initializes with valid configuration', () => {
  assert.equal(glucholazy.id, 'glucholazy');
  assert.equal(glucholazy.teryt, '1607014');
  assert.equal(glucholazy.label, 'Głuchołazy');
  assert.equal(glucholazy.voivodeship, 'opolskie');
  assert.equal(typeof glucholazy.crawlActive, 'function');
  assert.equal(typeof glucholazy.crawlResults, 'function');
});
