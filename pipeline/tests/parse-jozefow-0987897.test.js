import test from 'node:test';
import assert from 'node:assert/strict';
import jozefow0987897 from '../src/cities/jozefow-0987897/index.js';

test('Józefów adapter initializes with valid configuration', () => {
  assert.equal(jozefow0987897.id, 'jozefow-0987897');
  assert.equal(jozefow0987897.teryt, '0602074');
  assert.equal(jozefow0987897.label, 'Józefów');
  assert.equal(jozefow0987897.voivodeship, 'lubelskie');
  assert.equal(typeof jozefow0987897.crawlActive, 'function');
  assert.equal(typeof jozefow0987897.crawlResults, 'function');
});
