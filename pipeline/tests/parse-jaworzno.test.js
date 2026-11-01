import test from 'node:test';
import assert from 'node:assert/strict';
import jaworzno from '../src/cities/jaworzno/index.js';

test('Jaworzno adapter initializes with valid configuration', () => {
  assert.equal(jaworzno.id, 'jaworzno');
  assert.equal(jaworzno.teryt, '2468011');
  assert.equal(jaworzno.label, 'Jaworzno');
  assert.equal(jaworzno.voivodeship, 'slaskie');
  assert.equal(typeof jaworzno.crawlActive, 'function');
  assert.equal(typeof jaworzno.crawlResults, 'function');
});
