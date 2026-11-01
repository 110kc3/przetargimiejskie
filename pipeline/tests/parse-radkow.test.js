import test from 'node:test';
import assert from 'node:assert/strict';
import radkow from '../src/cities/radkow/index.js';

test('Radków adapter initializes with valid configuration', () => {
  assert.equal(radkow.id, 'radkow');
  assert.equal(radkow.teryt, '0208124');
  assert.equal(radkow.label, 'Radków');
  assert.equal(radkow.voivodeship, 'dolnoslaskie');
  assert.equal(typeof radkow.crawlActive, 'function');
  assert.equal(typeof radkow.crawlResults, 'function');
});
