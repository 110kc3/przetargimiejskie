import test from 'node:test';
import assert from 'node:assert/strict';
import mrocza from '../src/cities/mrocza/index.js';

test('Mrocza adapter initializes with valid configuration', () => {
  assert.equal(mrocza.id, 'mrocza');
  assert.equal(mrocza.teryt, '0410024');
  assert.equal(mrocza.label, 'Mrocza');
  assert.equal(mrocza.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof mrocza.crawlActive, 'function');
  assert.equal(typeof mrocza.crawlResults, 'function');
});
