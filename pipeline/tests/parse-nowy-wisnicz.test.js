import test from 'node:test';
import assert from 'node:assert/strict';
import nowyWisnicz from '../src/cities/nowy-wisnicz/index.js';

test('Nowy Wiśnicz adapter initializes with valid configuration', () => {
  assert.equal(nowyWisnicz.id, 'nowy-wisnicz');
  assert.equal(nowyWisnicz.teryt, '1201064');
  assert.equal(nowyWisnicz.label, 'Nowy Wiśnicz');
  assert.equal(nowyWisnicz.voivodeship, 'malopolskie');
  assert.equal(typeof nowyWisnicz.crawlActive, 'function');
  assert.equal(typeof nowyWisnicz.crawlResults, 'function');
});
