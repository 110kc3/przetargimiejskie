import test from 'node:test';
import assert from 'node:assert/strict';
import sobkow from '../src/cities/sobkow/index.js';

test('Sobków adapter initializes with valid configuration', () => {
  assert.equal(sobkow.id, 'sobkow');
  assert.equal(sobkow.teryt, '2602084');
  assert.equal(sobkow.label, 'Sobków');
  assert.equal(sobkow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof sobkow.crawlActive, 'function');
  assert.equal(typeof sobkow.crawlResults, 'function');
});
