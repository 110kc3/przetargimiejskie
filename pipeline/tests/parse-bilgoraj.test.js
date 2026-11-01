import test from 'node:test';
import assert from 'node:assert/strict';
import bilgoraj from '../src/cities/bilgoraj/index.js';

test('Biłgoraj adapter initializes with valid configuration', () => {
  assert.equal(bilgoraj.id, 'bilgoraj');
  assert.equal(bilgoraj.teryt, '0602011');
  assert.equal(bilgoraj.label, 'Biłgoraj');
  assert.equal(bilgoraj.voivodeship, 'lubelskie');
  assert.equal(typeof bilgoraj.crawlActive, 'function');
  assert.equal(typeof bilgoraj.crawlResults, 'function');
});
