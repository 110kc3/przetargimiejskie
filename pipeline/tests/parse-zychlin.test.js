import test from 'node:test';
import assert from 'node:assert/strict';
import zychlin from '../src/cities/zychlin/index.js';

test('Żychlin adapter initializes with valid configuration', () => {
  assert.equal(zychlin.id, 'zychlin');
  assert.equal(zychlin.teryt, '1002114');
  assert.equal(zychlin.label, 'Żychlin');
  assert.equal(zychlin.voivodeship, 'lodzkie');
  assert.equal(typeof zychlin.crawlActive, 'function');
  assert.equal(typeof zychlin.crawlResults, 'function');
});
