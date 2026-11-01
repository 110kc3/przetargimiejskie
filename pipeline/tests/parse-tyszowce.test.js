import test from 'node:test';
import assert from 'node:assert/strict';
import tyszowce from '../src/cities/tyszowce/index.js';

test('Tyszowce adapter initializes with valid configuration', () => {
  assert.equal(tyszowce.id, 'tyszowce');
  assert.equal(tyszowce.teryt, '0618124');
  assert.equal(tyszowce.label, 'Tyszowce');
  assert.equal(tyszowce.voivodeship, 'lubelskie');
  assert.equal(typeof tyszowce.crawlActive, 'function');
  assert.equal(typeof tyszowce.crawlResults, 'function');
});
