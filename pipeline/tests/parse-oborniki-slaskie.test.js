import test from 'node:test';
import assert from 'node:assert/strict';
import obornikiSlaskie from '../src/cities/oborniki-slaskie/index.js';

test('Oborniki Śląskie adapter initializes with valid configuration', () => {
  assert.equal(obornikiSlaskie.id, 'oborniki-slaskie');
  assert.equal(obornikiSlaskie.teryt, '0220014');
  assert.equal(obornikiSlaskie.label, 'Oborniki Śląskie');
  assert.equal(obornikiSlaskie.voivodeship, 'dolnoslaskie');
  assert.equal(typeof obornikiSlaskie.crawlActive, 'function');
  assert.equal(typeof obornikiSlaskie.crawlResults, 'function');
});
