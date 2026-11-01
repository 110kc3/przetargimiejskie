import test from 'node:test';
import assert from 'node:assert/strict';
import ujazd0965967 from '../src/cities/ujazd-0965967/index.js';

test('Ujazd adapter initializes with valid configuration', () => {
  assert.equal(ujazd0965967.id, 'ujazd-0965967');
  assert.equal(ujazd0965967.teryt, '1611064');
  assert.equal(ujazd0965967.label, 'Ujazd');
  assert.equal(ujazd0965967.voivodeship, 'opolskie');
  assert.equal(typeof ujazd0965967.crawlActive, 'function');
  assert.equal(typeof ujazd0965967.crawlResults, 'function');
});
