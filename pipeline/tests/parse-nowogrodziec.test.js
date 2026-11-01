import test from 'node:test';
import assert from 'node:assert/strict';
import nowogrodziec from '../src/cities/nowogrodziec/index.js';

test('Nowogrodziec adapter initializes with valid configuration', () => {
  assert.equal(nowogrodziec.id, 'nowogrodziec');
  assert.equal(nowogrodziec.teryt, '0201044');
  assert.equal(nowogrodziec.label, 'Nowogrodziec');
  assert.equal(nowogrodziec.voivodeship, 'dolnoslaskie');
  assert.equal(typeof nowogrodziec.crawlActive, 'function');
  assert.equal(typeof nowogrodziec.crawlResults, 'function');
});
