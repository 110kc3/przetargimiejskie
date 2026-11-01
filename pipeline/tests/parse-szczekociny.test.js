import test from 'node:test';
import assert from 'node:assert/strict';
import szczekociny from '../src/cities/szczekociny/index.js';

test('Szczekociny adapter initializes with valid configuration', () => {
  assert.equal(szczekociny.id, 'szczekociny');
  assert.equal(szczekociny.teryt, '2416084');
  assert.equal(szczekociny.label, 'Szczekociny');
  assert.equal(szczekociny.voivodeship, 'slaskie');
  assert.equal(typeof szczekociny.crawlActive, 'function');
  assert.equal(typeof szczekociny.crawlResults, 'function');
});
