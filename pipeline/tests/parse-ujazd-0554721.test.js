import test from 'node:test';
import assert from 'node:assert/strict';
import ujazd0554721 from '../src/cities/ujazd-0554721/index.js';

test('Ujazd adapter initializes with valid configuration', () => {
  assert.equal(ujazd0554721.id, 'ujazd-0554721');
  assert.equal(ujazd0554721.teryt, '1016104');
  assert.equal(ujazd0554721.label, 'Ujazd');
  assert.equal(ujazd0554721.voivodeship, 'lodzkie');
  assert.equal(typeof ujazd0554721.crawlActive, 'function');
  assert.equal(typeof ujazd0554721.crawlResults, 'function');
});
