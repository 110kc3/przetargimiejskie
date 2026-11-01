import test from 'node:test';
import assert from 'node:assert/strict';
import mikolow from '../src/cities/mikolow/index.js';

test('Mikołów adapter initializes with valid configuration', () => {
  assert.equal(mikolow.id, 'mikolow');
  assert.equal(mikolow.teryt, '2408021');
  assert.equal(mikolow.label, 'Mikołów');
  assert.equal(mikolow.voivodeship, 'slaskie');
  assert.equal(typeof mikolow.crawlActive, 'function');
  assert.equal(typeof mikolow.crawlResults, 'function');
});
