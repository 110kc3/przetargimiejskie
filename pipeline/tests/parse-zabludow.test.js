import test from 'node:test';
import assert from 'node:assert/strict';
import zabludow from '../src/cities/zabludow/index.js';

test('Zabłudów adapter initializes with valid configuration', () => {
  assert.equal(zabludow.id, 'zabludow');
  assert.equal(zabludow.teryt, '2002144');
  assert.equal(zabludow.label, 'Zabłudów');
  assert.equal(zabludow.voivodeship, 'podlaskie');
  assert.equal(typeof zabludow.crawlActive, 'function');
  assert.equal(typeof zabludow.crawlResults, 'function');
});
