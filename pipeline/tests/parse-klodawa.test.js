import test from 'node:test';
import assert from 'node:assert/strict';
import klodawa from '../src/cities/klodawa/index.js';

test('Kłodawa adapter initializes with valid configuration', () => {
  assert.equal(klodawa.id, 'klodawa');
  assert.equal(klodawa.teryt, '3009064');
  assert.equal(klodawa.label, 'Kłodawa');
  assert.equal(klodawa.voivodeship, 'wielkopolskie');
  assert.equal(typeof klodawa.crawlActive, 'function');
  assert.equal(typeof klodawa.crawlResults, 'function');
});
