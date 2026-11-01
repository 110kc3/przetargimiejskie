import test from 'node:test';
import assert from 'node:assert/strict';
import wasilkow from '../src/cities/wasilkow/index.js';

test('Wasilków adapter initializes with valid configuration', () => {
  assert.equal(wasilkow.id, 'wasilkow');
  assert.equal(wasilkow.teryt, '2002134');
  assert.equal(wasilkow.label, 'Wasilków');
  assert.equal(wasilkow.voivodeship, 'podlaskie');
  assert.equal(typeof wasilkow.crawlActive, 'function');
  assert.equal(typeof wasilkow.crawlResults, 'function');
});
