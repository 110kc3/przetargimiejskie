import test from 'node:test';
import assert from 'node:assert/strict';
import jordanow from '../src/cities/jordanow/index.js';

test('Jordanów adapter initializes with valid configuration', () => {
  assert.equal(jordanow.id, 'jordanow');
  assert.equal(jordanow.teryt, '1215011');
  assert.equal(jordanow.label, 'Jordanów');
  assert.equal(jordanow.voivodeship, 'malopolskie');
  assert.equal(typeof jordanow.crawlActive, 'function');
  assert.equal(typeof jordanow.crawlResults, 'function');
});
