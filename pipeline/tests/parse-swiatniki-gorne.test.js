import test from 'node:test';
import assert from 'node:assert/strict';
import swiatnikiGorne from '../src/cities/swiatniki-gorne/index.js';

test('Świątniki Górne adapter initializes with valid configuration', () => {
  assert.equal(swiatnikiGorne.id, 'swiatniki-gorne');
  assert.equal(swiatnikiGorne.teryt, '1206144');
  assert.equal(swiatnikiGorne.label, 'Świątniki Górne');
  assert.equal(swiatnikiGorne.voivodeship, 'malopolskie');
  assert.equal(typeof swiatnikiGorne.crawlActive, 'function');
  assert.equal(typeof swiatnikiGorne.crawlResults, 'function');
});
