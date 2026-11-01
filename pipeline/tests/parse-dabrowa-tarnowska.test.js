import test from 'node:test';
import assert from 'node:assert/strict';
import dabrowaTarnowska from '../src/cities/dabrowa-tarnowska/index.js';

test('Dąbrowa Tarnowska adapter initializes with valid configuration', () => {
  assert.equal(dabrowaTarnowska.id, 'dabrowa-tarnowska');
  assert.equal(dabrowaTarnowska.teryt, '1204024');
  assert.equal(dabrowaTarnowska.label, 'Dąbrowa Tarnowska');
  assert.equal(dabrowaTarnowska.voivodeship, 'malopolskie');
  assert.equal(typeof dabrowaTarnowska.crawlActive, 'function');
  assert.equal(typeof dabrowaTarnowska.crawlResults, 'function');
});
