import test from 'node:test';
import assert from 'node:assert/strict';
import nowaDeba from '../src/cities/nowa-deba/index.js';

test('Nowa Dęba adapter initializes with valid configuration', () => {
  assert.equal(nowaDeba.id, 'nowa-deba');
  assert.equal(nowaDeba.teryt, '1820044');
  assert.equal(nowaDeba.label, 'Nowa Dęba');
  assert.equal(nowaDeba.voivodeship, 'podkarpackie');
  assert.equal(typeof nowaDeba.crawlActive, 'function');
  assert.equal(typeof nowaDeba.crawlResults, 'function');
});
