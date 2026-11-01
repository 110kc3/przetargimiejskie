import test from 'node:test';
import assert from 'node:assert/strict';
import bojanowo from '../src/cities/bojanowo/index.js';

test('Bojanowo adapter initializes with valid configuration', () => {
  assert.equal(bojanowo.id, 'bojanowo');
  assert.equal(bojanowo.teryt, '3022014');
  assert.equal(bojanowo.label, 'Bojanowo');
  assert.equal(bojanowo.voivodeship, 'wielkopolskie');
  assert.equal(typeof bojanowo.crawlActive, 'function');
  assert.equal(typeof bojanowo.crawlResults, 'function');
});
