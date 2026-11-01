import test from 'node:test';
import assert from 'node:assert/strict';
import rumia from '../src/cities/rumia/index.js';

test('Rumia adapter initializes with valid configuration', () => {
  assert.equal(rumia.id, 'rumia');
  assert.equal(rumia.teryt, '2215021');
  assert.equal(rumia.label, 'Rumia');
  assert.equal(rumia.voivodeship, 'pomorskie');
  assert.equal(typeof rumia.crawlActive, 'function');
  assert.equal(typeof rumia.crawlResults, 'function');
});
