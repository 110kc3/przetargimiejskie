import test from 'node:test';
import assert from 'node:assert/strict';
import koscian from '../src/cities/koscian/index.js';

test('Kościan adapter initializes with valid configuration', () => {
  assert.equal(koscian.id, 'koscian');
  assert.equal(koscian.teryt, '3011011');
  assert.equal(koscian.label, 'Kościan');
  assert.equal(koscian.voivodeship, 'wielkopolskie');
  assert.equal(typeof koscian.crawlActive, 'function');
  assert.equal(typeof koscian.crawlResults, 'function');
});
