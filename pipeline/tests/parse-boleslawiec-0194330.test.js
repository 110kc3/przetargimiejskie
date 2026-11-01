import test from 'node:test';
import assert from 'node:assert/strict';
import boleslawiec0194330 from '../src/cities/boleslawiec-0194330/index.js';

test('Bolesławiec adapter initializes with valid configuration', () => {
  assert.equal(boleslawiec0194330.id, 'boleslawiec-0194330');
  assert.equal(boleslawiec0194330.teryt, '1018014');
  assert.equal(boleslawiec0194330.label, 'Bolesławiec');
  assert.equal(boleslawiec0194330.voivodeship, 'lodzkie');
  assert.equal(typeof boleslawiec0194330.crawlActive, 'function');
  assert.equal(typeof boleslawiec0194330.crawlResults, 'function');
});
