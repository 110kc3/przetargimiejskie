import test from 'node:test';
import assert from 'node:assert/strict';
import piekarySlaskie from '../src/cities/piekary-slaskie/index.js';

test('Piekary Śląskie adapter initializes with valid configuration', () => {
  assert.equal(piekarySlaskie.id, 'piekary-slaskie');
  assert.equal(piekarySlaskie.teryt, '2471011');
  assert.equal(piekarySlaskie.label, 'Piekary Śląskie');
  assert.equal(piekarySlaskie.voivodeship, 'slaskie');
  assert.equal(typeof piekarySlaskie.crawlActive, 'function');
  assert.equal(typeof piekarySlaskie.crawlResults, 'function');
});
