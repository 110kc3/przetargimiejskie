import test from 'node:test';
import assert from 'node:assert/strict';
import lubraniec from '../src/cities/lubraniec/index.js';

test('Lubraniec adapter initializes with valid configuration', () => {
  assert.equal(lubraniec.id, 'lubraniec');
  assert.equal(lubraniec.teryt, '0418124');
  assert.equal(lubraniec.label, 'Lubraniec');
  assert.equal(lubraniec.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof lubraniec.crawlActive, 'function');
  assert.equal(typeof lubraniec.crawlResults, 'function');
});
