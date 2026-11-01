import test from 'node:test';
import assert from 'node:assert/strict';
import ostrorog from '../src/cities/ostrorog/index.js';

test('Ostroróg adapter initializes with valid configuration', () => {
  assert.equal(ostrorog.id, 'ostrorog');
  assert.equal(ostrorog.teryt, '3024054');
  assert.equal(ostrorog.label, 'Ostroróg');
  assert.equal(ostrorog.voivodeship, 'wielkopolskie');
  assert.equal(typeof ostrorog.crawlActive, 'function');
  assert.equal(typeof ostrorog.crawlResults, 'function');
});
