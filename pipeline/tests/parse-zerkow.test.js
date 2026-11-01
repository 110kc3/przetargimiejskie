import test from 'node:test';
import assert from 'node:assert/strict';
import zerkow from '../src/cities/zerkow/index.js';

test('Żerków adapter initializes with valid configuration', () => {
  assert.equal(zerkow.id, 'zerkow');
  assert.equal(zerkow.teryt, '3006044');
  assert.equal(zerkow.label, 'Żerków');
  assert.equal(zerkow.voivodeship, 'wielkopolskie');
  assert.equal(typeof zerkow.crawlActive, 'function');
  assert.equal(typeof zerkow.crawlResults, 'function');
});
