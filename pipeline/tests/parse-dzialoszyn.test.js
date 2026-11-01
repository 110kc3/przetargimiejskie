import test from 'node:test';
import assert from 'node:assert/strict';
import dzialoszyn from '../src/cities/dzialoszyn/index.js';

test('Działoszyn adapter initializes with valid configuration', () => {
  assert.equal(dzialoszyn.id, 'dzialoszyn');
  assert.equal(dzialoszyn.teryt, '1009014');
  assert.equal(dzialoszyn.label, 'Działoszyn');
  assert.equal(dzialoszyn.voivodeship, 'lodzkie');
  assert.equal(typeof dzialoszyn.crawlActive, 'function');
  assert.equal(typeof dzialoszyn.crawlResults, 'function');
});
