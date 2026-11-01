import test from 'node:test';
import assert from 'node:assert/strict';
import bychawa from '../src/cities/bychawa/index.js';

test('Bychawa adapter initializes with valid configuration', () => {
  assert.equal(bychawa.id, 'bychawa');
  assert.equal(bychawa.teryt, '0609034');
  assert.equal(bychawa.label, 'Bychawa');
  assert.equal(bychawa.voivodeship, 'lubelskie');
  assert.equal(typeof bychawa.crawlActive, 'function');
  assert.equal(typeof bychawa.crawlResults, 'function');
});
