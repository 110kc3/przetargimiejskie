import test from 'node:test';
import assert from 'node:assert/strict';
import zukowo from '../src/cities/zukowo/index.js';

test('Żukowo adapter initializes with valid configuration', () => {
  assert.equal(zukowo.id, 'zukowo');
  assert.equal(zukowo.teryt, '2205084');
  assert.equal(zukowo.label, 'Żukowo');
  assert.equal(zukowo.voivodeship, 'pomorskie');
  assert.equal(typeof zukowo.crawlActive, 'function');
  assert.equal(typeof zukowo.crawlResults, 'function');
});
