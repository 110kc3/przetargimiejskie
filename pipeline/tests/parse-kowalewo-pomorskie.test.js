import test from 'node:test';
import assert from 'node:assert/strict';
import kowalewoPomorskie from '../src/cities/kowalewo-pomorskie/index.js';

test('Kowalewo Pomorskie adapter initializes with valid configuration', () => {
  assert.equal(kowalewoPomorskie.id, 'kowalewo-pomorskie');
  assert.equal(kowalewoPomorskie.teryt, '0405044');
  assert.equal(kowalewoPomorskie.label, 'Kowalewo Pomorskie');
  assert.equal(kowalewoPomorskie.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof kowalewoPomorskie.crawlActive, 'function');
  assert.equal(typeof kowalewoPomorskie.crawlResults, 'function');
});
