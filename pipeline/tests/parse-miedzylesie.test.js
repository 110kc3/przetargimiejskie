import test from 'node:test';
import assert from 'node:assert/strict';
import miedzylesie from '../src/cities/miedzylesie/index.js';

test('Międzylesie adapter initializes with valid configuration', () => {
  assert.equal(miedzylesie.id, 'miedzylesie');
  assert.equal(miedzylesie.teryt, '0208104');
  assert.equal(miedzylesie.label, 'Międzylesie');
  assert.equal(miedzylesie.voivodeship, 'dolnoslaskie');
  assert.equal(typeof miedzylesie.crawlActive, 'function');
  assert.equal(typeof miedzylesie.crawlResults, 'function');
});
