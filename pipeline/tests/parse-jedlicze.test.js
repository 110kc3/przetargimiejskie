import test from 'node:test';
import assert from 'node:assert/strict';
import jedlicze from '../src/cities/jedlicze/index.js';

test('Jedlicze adapter initializes with valid configuration', () => {
  assert.equal(jedlicze.id, 'jedlicze');
  assert.equal(jedlicze.teryt, '1807044');
  assert.equal(jedlicze.label, 'Jedlicze');
  assert.equal(jedlicze.voivodeship, 'podkarpackie');
  assert.equal(typeof jedlicze.crawlActive, 'function');
  assert.equal(typeof jedlicze.crawlResults, 'function');
});
