import test from 'node:test';
import assert from 'node:assert/strict';
import aleksandrowLodzki from '../src/cities/aleksandrow-lodzki/index.js';

test('Aleksandrów Łódzki adapter initializes with valid configuration', () => {
  assert.equal(aleksandrowLodzki.id, 'aleksandrow-lodzki');
  assert.equal(aleksandrowLodzki.teryt, '1020044');
  assert.equal(aleksandrowLodzki.label, 'Aleksandrów Łódzki');
  assert.equal(aleksandrowLodzki.voivodeship, 'lodzkie');
  assert.equal(typeof aleksandrowLodzki.crawlActive, 'function');
  assert.equal(typeof aleksandrowLodzki.crawlResults, 'function');
});
