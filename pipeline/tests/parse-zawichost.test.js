import test from 'node:test';
import assert from 'node:assert/strict';
import zawichost from '../src/cities/zawichost/index.js';

test('Zawichost adapter initializes with valid configuration', () => {
  assert.equal(zawichost.id, 'zawichost');
  assert.equal(zawichost.teryt, '2609094');
  assert.equal(zawichost.label, 'Zawichost');
  assert.equal(zawichost.voivodeship, 'swietokrzyskie');
  assert.equal(typeof zawichost.crawlActive, 'function');
  assert.equal(typeof zawichost.crawlResults, 'function');
});
