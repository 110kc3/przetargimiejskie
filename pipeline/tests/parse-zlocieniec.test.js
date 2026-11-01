import test from 'node:test';
import assert from 'node:assert/strict';
import zlocieniec from '../src/cities/zlocieniec/index.js';

test('Złocieniec adapter initializes with valid configuration', () => {
  assert.equal(zlocieniec.id, 'zlocieniec');
  assert.equal(zlocieniec.teryt, '3203064');
  assert.equal(zlocieniec.label, 'Złocieniec');
  assert.equal(zlocieniec.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof zlocieniec.crawlActive, 'function');
  assert.equal(typeof zlocieniec.crawlResults, 'function');
});
