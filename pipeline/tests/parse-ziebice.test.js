import test from 'node:test';
import assert from 'node:assert/strict';
import ziebice from '../src/cities/ziebice/index.js';

test('Ziębice adapter initializes with valid configuration', () => {
  assert.equal(ziebice.id, 'ziebice');
  assert.equal(ziebice.teryt, '0224064');
  assert.equal(ziebice.label, 'Ziębice');
  assert.equal(ziebice.voivodeship, 'dolnoslaskie');
  assert.equal(typeof ziebice.crawlActive, 'function');
  assert.equal(typeof ziebice.crawlResults, 'function');
});
