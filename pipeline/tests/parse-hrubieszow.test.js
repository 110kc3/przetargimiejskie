import test from 'node:test';
import assert from 'node:assert/strict';
import hrubieszow from '../src/cities/hrubieszow/index.js';

test('Hrubieszów adapter initializes with valid configuration', () => {
  assert.equal(hrubieszow.id, 'hrubieszow');
  assert.equal(hrubieszow.teryt, '0604011');
  assert.equal(hrubieszow.label, 'Hrubieszów');
  assert.equal(hrubieszow.voivodeship, 'lubelskie');
  assert.equal(typeof hrubieszow.crawlActive, 'function');
  assert.equal(typeof hrubieszow.crawlResults, 'function');
});
