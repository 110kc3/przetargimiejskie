import test from 'node:test';
import assert from 'node:assert/strict';
import niemcza from '../src/cities/niemcza/index.js';

test('Niemcza adapter initializes with valid configuration', () => {
  assert.equal(niemcza.id, 'niemcza');
  assert.equal(niemcza.teryt, '0202074');
  assert.equal(niemcza.label, 'Niemcza');
  assert.equal(niemcza.voivodeship, 'dolnoslaskie');
  assert.equal(typeof niemcza.crawlActive, 'function');
  assert.equal(typeof niemcza.crawlResults, 'function');
});
