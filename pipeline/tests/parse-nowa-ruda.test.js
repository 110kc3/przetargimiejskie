import test from 'node:test';
import assert from 'node:assert/strict';
import nowaRuda from '../src/cities/nowa-ruda/index.js';

test('Nowa Ruda adapter initializes with valid configuration', () => {
  assert.equal(nowaRuda.id, 'nowa-ruda');
  assert.equal(nowaRuda.teryt, '0208041');
  assert.equal(nowaRuda.label, 'Nowa Ruda');
  assert.equal(nowaRuda.voivodeship, 'dolnoslaskie');
  assert.equal(typeof nowaRuda.crawlActive, 'function');
  assert.equal(typeof nowaRuda.crawlResults, 'function');
});
