import test from 'node:test';
import assert from 'node:assert/strict';
import brzegDolny from '../src/cities/brzeg-dolny/index.js';

test('Brzeg Dolny adapter initializes with valid configuration', () => {
  assert.equal(brzegDolny.id, 'brzeg-dolny');
  assert.equal(brzegDolny.teryt, '0222014');
  assert.equal(brzegDolny.label, 'Brzeg Dolny');
  assert.equal(brzegDolny.voivodeship, 'dolnoslaskie');
  assert.equal(typeof brzegDolny.crawlActive, 'function');
  assert.equal(typeof brzegDolny.crawlResults, 'function');
});
