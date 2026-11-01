import test from 'node:test';
import assert from 'node:assert/strict';
import wodzislaw from '../src/cities/wodzislaw/index.js';

test('Wodzisław adapter initializes with valid configuration', () => {
  assert.equal(wodzislaw.id, 'wodzislaw');
  assert.equal(wodzislaw.teryt, '2602094');
  assert.equal(wodzislaw.label, 'Wodzisław');
  assert.equal(wodzislaw.voivodeship, 'swietokrzyskie');
  assert.equal(typeof wodzislaw.crawlActive, 'function');
  assert.equal(typeof wodzislaw.crawlResults, 'function');
});
