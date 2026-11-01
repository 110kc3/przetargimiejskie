import test from 'node:test';
import assert from 'node:assert/strict';
import malkiniaGorna from '../src/cities/malkinia-gorna/index.js';

test('Małkinia Górna adapter initializes with valid configuration', () => {
  assert.equal(malkiniaGorna.id, 'malkinia-gorna');
  assert.equal(malkiniaGorna.teryt, '1416054');
  assert.equal(malkiniaGorna.label, 'Małkinia Górna');
  assert.equal(malkiniaGorna.voivodeship, 'mazowieckie');
  assert.equal(typeof malkiniaGorna.crawlActive, 'function');
  assert.equal(typeof malkiniaGorna.crawlResults, 'function');
});
