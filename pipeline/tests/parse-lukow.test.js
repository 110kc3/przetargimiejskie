import test from 'node:test';
import assert from 'node:assert/strict';
import lukow from '../src/cities/lukow/index.js';

test('Łuków adapter initializes with valid configuration', () => {
  assert.equal(lukow.id, 'lukow');
  assert.equal(lukow.teryt, '0611011');
  assert.equal(lukow.label, 'Łuków');
  assert.equal(lukow.voivodeship, 'lubelskie');
  assert.equal(typeof lukow.crawlActive, 'function');
  assert.equal(typeof lukow.crawlResults, 'function');
});
