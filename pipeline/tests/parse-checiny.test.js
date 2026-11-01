import test from 'node:test';
import assert from 'node:assert/strict';
import checiny from '../src/cities/checiny/index.js';

test('Chęciny adapter initializes with valid configuration', () => {
  assert.equal(checiny.id, 'checiny');
  assert.equal(checiny.teryt, '2604034');
  assert.equal(checiny.label, 'Chęciny');
  assert.equal(checiny.voivodeship, 'swietokrzyskie');
  assert.equal(typeof checiny.crawlActive, 'function');
  assert.equal(typeof checiny.crawlResults, 'function');
});
