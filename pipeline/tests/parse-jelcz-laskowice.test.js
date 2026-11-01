import test from 'node:test';
import assert from 'node:assert/strict';
import jelczLaskowice from '../src/cities/jelcz-laskowice/index.js';

test('Jelcz-Laskowice adapter initializes with valid configuration', () => {
  assert.equal(jelczLaskowice.id, 'jelcz-laskowice');
  assert.equal(jelczLaskowice.teryt, '0215034');
  assert.equal(jelczLaskowice.label, 'Jelcz-Laskowice');
  assert.equal(jelczLaskowice.voivodeship, 'dolnoslaskie');
  assert.equal(typeof jelczLaskowice.crawlActive, 'function');
  assert.equal(typeof jelczLaskowice.crawlResults, 'function');
});
