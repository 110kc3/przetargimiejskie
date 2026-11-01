import test from 'node:test';
import assert from 'node:assert/strict';
import grodkow from '../src/cities/grodkow/index.js';

test('Grodków adapter initializes with valid configuration', () => {
  assert.equal(grodkow.id, 'grodkow');
  assert.equal(grodkow.teryt, '1601034');
  assert.equal(grodkow.label, 'Grodków');
  assert.equal(grodkow.voivodeship, 'opolskie');
  assert.equal(typeof grodkow.crawlActive, 'function');
  assert.equal(typeof grodkow.crawlResults, 'function');
});
