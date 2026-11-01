import test from 'node:test';
import assert from 'node:assert/strict';
import malogoszcz from '../src/cities/malogoszcz/index.js';

test('Małogoszcz adapter initializes with valid configuration', () => {
  assert.equal(malogoszcz.id, 'malogoszcz');
  assert.equal(malogoszcz.teryt, '2602034');
  assert.equal(malogoszcz.label, 'Małogoszcz');
  assert.equal(malogoszcz.voivodeship, 'swietokrzyskie');
  assert.equal(typeof malogoszcz.crawlActive, 'function');
  assert.equal(typeof malogoszcz.crawlResults, 'function');
});
