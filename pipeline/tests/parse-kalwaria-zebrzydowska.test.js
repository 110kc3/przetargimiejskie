import test from 'node:test';
import assert from 'node:assert/strict';
import kalwariaZebrzydowska from '../src/cities/kalwaria-zebrzydowska/index.js';

test('Kalwaria Zebrzydowska adapter initializes with valid configuration', () => {
  assert.equal(kalwariaZebrzydowska.id, 'kalwaria-zebrzydowska');
  assert.equal(kalwariaZebrzydowska.teryt, '1218034');
  assert.equal(kalwariaZebrzydowska.label, 'Kalwaria Zebrzydowska');
  assert.equal(kalwariaZebrzydowska.voivodeship, 'malopolskie');
  assert.equal(typeof kalwariaZebrzydowska.crawlActive, 'function');
  assert.equal(typeof kalwariaZebrzydowska.crawlResults, 'function');
});
