import test from 'node:test';
import assert from 'node:assert/strict';
import kozienice from '../src/cities/kozienice/index.js';

test('Kozienice adapter initializes with valid configuration', () => {
  assert.equal(kozienice.id, 'kozienice');
  assert.equal(kozienice.teryt, '1407054');
  assert.equal(kozienice.label, 'Kozienice');
  assert.equal(kozienice.voivodeship, 'mazowieckie');
  assert.equal(typeof kozienice.crawlActive, 'function');
  assert.equal(typeof kozienice.crawlResults, 'function');
});
