import test from 'node:test';
import assert from 'node:assert/strict';
import zielonaGora from '../src/cities/zielona-gora/index.js';

test('Zielona Góra adapter initializes with valid configuration', () => {
  assert.equal(zielonaGora.id, 'zielona-gora');
  assert.equal(zielonaGora.teryt, '0862011');
  assert.equal(zielonaGora.label, 'Zielona Góra');
  assert.equal(zielonaGora.voivodeship, 'lubuskie');
  assert.equal(typeof zielonaGora.crawlActive, 'function');
  assert.equal(typeof zielonaGora.crawlResults, 'function');
});
