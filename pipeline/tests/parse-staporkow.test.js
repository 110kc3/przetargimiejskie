import test from 'node:test';
import assert from 'node:assert/strict';
import staporkow from '../src/cities/staporkow/index.js';

test('Stąporków adapter initializes with valid configuration', () => {
  assert.equal(staporkow.id, 'staporkow');
  assert.equal(staporkow.teryt, '2605084');
  assert.equal(staporkow.label, 'Stąporków');
  assert.equal(staporkow.voivodeship, 'swietokrzyskie');
  assert.equal(typeof staporkow.crawlActive, 'function');
  assert.equal(typeof staporkow.crawlResults, 'function');
});
