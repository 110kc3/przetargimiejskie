import test from 'node:test';
import assert from 'node:assert/strict';
import zbaszynek from '../src/cities/zbaszynek/index.js';

test('Zbąszynek adapter initializes with valid configuration', () => {
  assert.equal(zbaszynek.id, 'zbaszynek');
  assert.equal(zbaszynek.teryt, '0808064');
  assert.equal(zbaszynek.label, 'Zbąszynek');
  assert.equal(zbaszynek.voivodeship, 'lubuskie');
  assert.equal(typeof zbaszynek.crawlActive, 'function');
  assert.equal(typeof zbaszynek.crawlResults, 'function');
});
