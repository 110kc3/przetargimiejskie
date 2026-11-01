import test from 'node:test';
import assert from 'node:assert/strict';
import szczawnica from '../src/cities/szczawnica/index.js';

test('Szczawnica adapter initializes with valid configuration', () => {
  assert.equal(szczawnica.id, 'szczawnica');
  assert.equal(szczawnica.teryt, '1211024');
  assert.equal(szczawnica.label, 'Szczawnica');
  assert.equal(szczawnica.voivodeship, 'malopolskie');
  assert.equal(typeof szczawnica.crawlActive, 'function');
  assert.equal(typeof szczawnica.crawlResults, 'function');
});
