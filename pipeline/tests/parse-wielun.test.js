import test from 'node:test';
import assert from 'node:assert/strict';
import wielun from '../src/cities/wielun/index.js';

test('Wieluń adapter initializes with valid configuration', () => {
  assert.equal(wielun.id, 'wielun');
  assert.equal(wielun.teryt, '1017094');
  assert.equal(wielun.label, 'Wieluń');
  assert.equal(wielun.voivodeship, 'lodzkie');
  assert.equal(typeof wielun.crawlActive, 'function');
  assert.equal(typeof wielun.crawlResults, 'function');
});
