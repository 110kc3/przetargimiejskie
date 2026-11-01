import test from 'node:test';
import assert from 'node:assert/strict';
import swieradowZdroj from '../src/cities/swieradow-zdroj/index.js';

test('Świeradów-Zdrój adapter initializes with valid configuration', () => {
  assert.equal(swieradowZdroj.id, 'swieradow-zdroj');
  assert.equal(swieradowZdroj.teryt, '0210021');
  assert.equal(swieradowZdroj.label, 'Świeradów-Zdrój');
  assert.equal(swieradowZdroj.voivodeship, 'dolnoslaskie');
  assert.equal(typeof swieradowZdroj.crawlActive, 'function');
  assert.equal(typeof swieradowZdroj.crawlResults, 'function');
});
