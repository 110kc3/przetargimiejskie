import test from 'node:test';
import assert from 'node:assert/strict';
import siedliszcze from '../src/cities/siedliszcze/index.js';

test('Siedliszcze adapter initializes with valid configuration', () => {
  assert.equal(siedliszcze.id, 'siedliszcze');
  assert.equal(siedliszcze.teryt, '0603114');
  assert.equal(siedliszcze.label, 'Siedliszcze');
  assert.equal(siedliszcze.voivodeship, 'lubelskie');
  assert.equal(typeof siedliszcze.crawlActive, 'function');
  assert.equal(typeof siedliszcze.crawlResults, 'function');
});
