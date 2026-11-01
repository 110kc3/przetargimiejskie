import test from 'node:test';
import assert from 'node:assert/strict';
import poniatowa from '../src/cities/poniatowa/index.js';

test('Poniatowa adapter initializes with valid configuration', () => {
  assert.equal(poniatowa.id, 'poniatowa');
  assert.equal(poniatowa.teryt, '0612064');
  assert.equal(poniatowa.label, 'Poniatowa');
  assert.equal(poniatowa.voivodeship, 'lubelskie');
  assert.equal(typeof poniatowa.crawlActive, 'function');
  assert.equal(typeof poniatowa.crawlResults, 'function');
});
