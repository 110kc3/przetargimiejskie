import test from 'node:test';
import assert from 'node:assert/strict';
import okonek from '../src/cities/okonek/index.js';

test('Okonek adapter initializes with valid configuration', () => {
  assert.equal(okonek.id, 'okonek');
  assert.equal(okonek.teryt, '3031054');
  assert.equal(okonek.label, 'Okonek');
  assert.equal(okonek.voivodeship, 'wielkopolskie');
  assert.equal(typeof okonek.crawlActive, 'function');
  assert.equal(typeof okonek.crawlResults, 'function');
});
