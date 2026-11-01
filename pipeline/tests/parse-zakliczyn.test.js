import test from 'node:test';
import assert from 'node:assert/strict';
import zakliczyn from '../src/cities/zakliczyn/index.js';

test('Zakliczyn adapter initializes with valid configuration', () => {
  assert.equal(zakliczyn.id, 'zakliczyn');
  assert.equal(zakliczyn.teryt, '1216144');
  assert.equal(zakliczyn.label, 'Zakliczyn');
  assert.equal(zakliczyn.voivodeship, 'malopolskie');
  assert.equal(typeof zakliczyn.crawlActive, 'function');
  assert.equal(typeof zakliczyn.crawlResults, 'function');
});
