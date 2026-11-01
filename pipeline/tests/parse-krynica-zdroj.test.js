import test from 'node:test';
import assert from 'node:assert/strict';
import krynicaZdroj from '../src/cities/krynica-zdroj/index.js';

test('Krynica-Zdrój adapter initializes with valid configuration', () => {
  assert.equal(krynicaZdroj.id, 'krynica-zdroj');
  assert.equal(krynicaZdroj.teryt, '1210074');
  assert.equal(krynicaZdroj.label, 'Krynica-Zdrój');
  assert.equal(krynicaZdroj.voivodeship, 'malopolskie');
  assert.equal(typeof krynicaZdroj.crawlActive, 'function');
  assert.equal(typeof krynicaZdroj.crawlResults, 'function');
});
