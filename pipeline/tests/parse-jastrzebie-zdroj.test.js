import test from 'node:test';
import assert from 'node:assert/strict';
import jastrzebieZdroj from '../src/cities/jastrzebie-zdroj/index.js';

test('Jastrzębie-Zdrój adapter initializes with valid configuration', () => {
  assert.equal(jastrzebieZdroj.id, 'jastrzebie-zdroj');
  assert.equal(jastrzebieZdroj.teryt, '2467011');
  assert.equal(jastrzebieZdroj.label, 'Jastrzębie-Zdrój');
  assert.equal(jastrzebieZdroj.voivodeship, 'slaskie');
  assert.equal(typeof jastrzebieZdroj.crawlActive, 'function');
  assert.equal(typeof jastrzebieZdroj.crawlResults, 'function');
});
