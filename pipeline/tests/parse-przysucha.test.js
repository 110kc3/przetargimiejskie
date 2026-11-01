import test from 'node:test';
import assert from 'node:assert/strict';
import przysucha from '../src/cities/przysucha/index.js';

test('Przysucha adapter initializes with valid configuration', () => {
  assert.equal(przysucha.id, 'przysucha');
  assert.equal(przysucha.teryt, '1423064');
  assert.equal(przysucha.label, 'Przysucha');
  assert.equal(przysucha.voivodeship, 'mazowieckie');
  assert.equal(typeof przysucha.crawlActive, 'function');
  assert.equal(typeof przysucha.crawlResults, 'function');
});
