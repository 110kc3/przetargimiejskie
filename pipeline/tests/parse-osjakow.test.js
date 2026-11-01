import test from 'node:test';
import assert from 'node:assert/strict';
import osjakow from '../src/cities/osjakow/index.js';

test('Osjaków adapter initializes with valid configuration', () => {
  assert.equal(osjakow.id, 'osjakow');
  assert.equal(osjakow.teryt, '1017054');
  assert.equal(osjakow.label, 'Osjaków');
  assert.equal(osjakow.voivodeship, 'lodzkie');
  assert.equal(typeof osjakow.crawlActive, 'function');
  assert.equal(typeof osjakow.crawlResults, 'function');
});
