import test from 'node:test';
import assert from 'node:assert/strict';
import strykow from '../src/cities/strykow/index.js';

test('Stryków adapter initializes with valid configuration', () => {
  assert.equal(strykow.id, 'strykow');
  assert.equal(strykow.teryt, '1020084');
  assert.equal(strykow.label, 'Stryków');
  assert.equal(strykow.voivodeship, 'lodzkie');
  assert.equal(typeof strykow.crawlActive, 'function');
  assert.equal(typeof strykow.crawlResults, 'function');
});
