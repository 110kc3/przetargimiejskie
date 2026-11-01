import test from 'node:test';
import assert from 'node:assert/strict';
import ryglice from '../src/cities/ryglice/index.js';

test('Ryglice adapter initializes with valid configuration', () => {
  assert.equal(ryglice.id, 'ryglice');
  assert.equal(ryglice.teryt, '1216064');
  assert.equal(ryglice.label, 'Ryglice');
  assert.equal(ryglice.voivodeship, 'malopolskie');
  assert.equal(typeof ryglice.crawlActive, 'function');
  assert.equal(typeof ryglice.crawlResults, 'function');
});
