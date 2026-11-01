import test from 'node:test';
import assert from 'node:assert/strict';
import zawadzkie from '../src/cities/zawadzkie/index.js';

test('Zawadzkie adapter initializes with valid configuration', () => {
  assert.equal(zawadzkie.id, 'zawadzkie');
  assert.equal(zawadzkie.teryt, '1611074');
  assert.equal(zawadzkie.label, 'Zawadzkie');
  assert.equal(zawadzkie.voivodeship, 'opolskie');
  assert.equal(typeof zawadzkie.crawlActive, 'function');
  assert.equal(typeof zawadzkie.crawlResults, 'function');
});
