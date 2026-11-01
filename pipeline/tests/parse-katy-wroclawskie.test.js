import test from 'node:test';
import assert from 'node:assert/strict';
import katyWroclawskie from '../src/cities/katy-wroclawskie/index.js';

test('Kąty Wrocławskie adapter initializes with valid configuration', () => {
  assert.equal(katyWroclawskie.id, 'katy-wroclawskie');
  assert.equal(katyWroclawskie.teryt, '0223044');
  assert.equal(katyWroclawskie.label, 'Kąty Wrocławskie');
  assert.equal(katyWroclawskie.voivodeship, 'dolnoslaskie');
  assert.equal(typeof katyWroclawskie.crawlActive, 'function');
  assert.equal(typeof katyWroclawskie.crawlResults, 'function');
});
