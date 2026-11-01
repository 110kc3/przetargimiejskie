import test from 'node:test';
import assert from 'node:assert/strict';
import rejowiecFabryczny from '../src/cities/rejowiec-fabryczny/index.js';

test('Rejowiec Fabryczny adapter initializes with valid configuration', () => {
  assert.equal(rejowiecFabryczny.id, 'rejowiec-fabryczny');
  assert.equal(rejowiecFabryczny.teryt, '0603011');
  assert.equal(rejowiecFabryczny.label, 'Rejowiec Fabryczny');
  assert.equal(rejowiecFabryczny.voivodeship, 'lubelskie');
  assert.equal(typeof rejowiecFabryczny.crawlActive, 'function');
  assert.equal(typeof rejowiecFabryczny.crawlResults, 'function');
});
