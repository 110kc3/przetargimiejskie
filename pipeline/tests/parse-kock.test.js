import test from 'node:test';
import assert from 'node:assert/strict';
import kock from '../src/cities/kock/index.js';

test('Kock adapter initializes with valid configuration', () => {
  assert.equal(kock.id, 'kock');
  assert.equal(kock.teryt, '0608064');
  assert.equal(kock.label, 'Kock');
  assert.equal(kock.voivodeship, 'lubelskie');
  assert.equal(typeof kock.crawlActive, 'function');
  assert.equal(typeof kock.crawlResults, 'function');
});
