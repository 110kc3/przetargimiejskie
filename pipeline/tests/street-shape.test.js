import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidStreetNumber } from '../src/core/street-shape.js';

test('source-verified commemorative numbers are distinct from address bleed', () => {
  for (const name of ['3 Maja', '11 Listopada', 'Plac 1000-lecia', 'Konstytucji 3 Maja', 'Aleja 23 Stycznia']) {
    assert.equal(hasValidStreetNumber(name), true, name);
  }
  for (const name of ['Kozielska 13 g.', 'Miernicza 9 lokal', 'Plac 1000-lecia 10',
    'Konstytucji 3 Maja 20', 'Powstańców Warszawy działka nr 95/4']) {
    assert.equal(hasValidStreetNumber(name), false, name);
  }
});
