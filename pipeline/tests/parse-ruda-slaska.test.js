import test from 'node:test';
import assert from 'node:assert/strict';
import rudaSlaska from '../src/cities/ruda-slaska/index.js';

test('Ruda Śląska adapter initializes with valid configuration', () => {
  assert.equal(rudaSlaska.id, 'ruda-slaska');
  assert.equal(rudaSlaska.teryt, '2472011');
  assert.equal(rudaSlaska.label, 'Ruda Śląska');
  assert.equal(rudaSlaska.voivodeship, 'slaskie');
  assert.equal(typeof rudaSlaska.crawlActive, 'function');
  assert.equal(typeof rudaSlaska.crawlResults, 'function');
});
