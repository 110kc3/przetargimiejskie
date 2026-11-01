import test from 'node:test';
import assert from 'node:assert/strict';
import bogoria from '../src/cities/bogoria/index.js';

test('Bogoria adapter initializes with valid configuration', () => {
  assert.equal(bogoria.id, 'bogoria');
  assert.equal(bogoria.teryt, '2612014');
  assert.equal(bogoria.label, 'Bogoria');
  assert.equal(bogoria.voivodeship, 'swietokrzyskie');
  assert.equal(typeof bogoria.crawlActive, 'function');
  assert.equal(typeof bogoria.crawlResults, 'function');
});
