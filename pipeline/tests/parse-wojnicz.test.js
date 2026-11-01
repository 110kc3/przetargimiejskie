import test from 'node:test';
import assert from 'node:assert/strict';
import wojnicz from '../src/cities/wojnicz/index.js';

test('Wojnicz adapter initializes with valid configuration', () => {
  assert.equal(wojnicz.id, 'wojnicz');
  assert.equal(wojnicz.teryt, '1216134');
  assert.equal(wojnicz.label, 'Wojnicz');
  assert.equal(wojnicz.voivodeship, 'malopolskie');
  assert.equal(typeof wojnicz.crawlActive, 'function');
  assert.equal(typeof wojnicz.crawlResults, 'function');
});
