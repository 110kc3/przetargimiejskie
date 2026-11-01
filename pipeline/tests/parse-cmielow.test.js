import test from 'node:test';
import assert from 'node:assert/strict';
import cmielow from '../src/cities/cmielow/index.js';

test('Ćmielów adapter initializes with valid configuration', () => {
  assert.equal(cmielow.id, 'cmielow');
  assert.equal(cmielow.teryt, '2607044');
  assert.equal(cmielow.label, 'Ćmielów');
  assert.equal(cmielow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof cmielow.crawlActive, 'function');
  assert.equal(typeof cmielow.crawlResults, 'function');
});
