import test from 'node:test';
import assert from 'node:assert/strict';
import michalowo from '../src/cities/michalowo/index.js';

test('Michałowo adapter initializes with valid configuration', () => {
  assert.equal(michalowo.id, 'michalowo');
  assert.equal(michalowo.teryt, '2002074');
  assert.equal(michalowo.label, 'Michałowo');
  assert.equal(michalowo.voivodeship, 'podlaskie');
  assert.equal(typeof michalowo.crawlActive, 'function');
  assert.equal(typeof michalowo.crawlResults, 'function');
});
