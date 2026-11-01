import test from 'node:test';
import assert from 'node:assert/strict';
import szubin from '../src/cities/szubin/index.js';

test('Szubin adapter initializes with valid configuration', () => {
  assert.equal(szubin.id, 'szubin');
  assert.equal(szubin.teryt, '0410054');
  assert.equal(szubin.label, 'Szubin');
  assert.equal(szubin.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof szubin.crawlActive, 'function');
  assert.equal(typeof szubin.crawlResults, 'function');
});
