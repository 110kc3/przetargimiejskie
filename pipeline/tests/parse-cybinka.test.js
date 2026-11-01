import test from 'node:test';
import assert from 'node:assert/strict';
import cybinka from '../src/cities/cybinka/index.js';

test('Cybinka adapter initializes with valid configuration', () => {
  assert.equal(cybinka.id, 'cybinka');
  assert.equal(cybinka.teryt, '0805014');
  assert.equal(cybinka.label, 'Cybinka');
  assert.equal(cybinka.voivodeship, 'lubuskie');
  assert.equal(typeof cybinka.crawlActive, 'function');
  assert.equal(typeof cybinka.crawlResults, 'function');
});
