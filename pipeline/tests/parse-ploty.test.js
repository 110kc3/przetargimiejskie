import test from 'node:test';
import assert from 'node:assert/strict';
import ploty from '../src/cities/ploty/index.js';

test('Płoty adapter initializes with valid configuration', () => {
  assert.equal(ploty.id, 'ploty');
  assert.equal(ploty.teryt, '3205044');
  assert.equal(ploty.label, 'Płoty');
  assert.equal(ploty.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof ploty.crawlActive, 'function');
  assert.equal(typeof ploty.crawlResults, 'function');
});
