import test from 'node:test';
import assert from 'node:assert/strict';
import ksiazWielki from '../src/cities/ksiaz-wielki/index.js';

test('Książ Wielki adapter initializes with valid configuration', () => {
  assert.equal(ksiazWielki.id, 'ksiaz-wielki');
  assert.equal(ksiazWielki.teryt, '1208044');
  assert.equal(ksiazWielki.label, 'Książ Wielki');
  assert.equal(ksiazWielki.voivodeship, 'malopolskie');
  assert.equal(typeof ksiazWielki.crawlActive, 'function');
  assert.equal(typeof ksiazWielki.crawlResults, 'function');
});
