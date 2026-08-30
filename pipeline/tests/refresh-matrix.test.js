import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cities } from '../src/cities/index.js';
import { buildRefreshMatrix } from '../scripts/refresh-matrix.js';

const EGRESS_CITIES = ['brzeg', 'raciborz', 'swietochlowice', 'walbrzych'];

test('hosted refresh matrix excludes only residential-egress adapters', () => {
  const matrix = buildRefreshMatrix(cities);

  assert.deepEqual(matrix.blocked_cities.sort(), EGRESS_CITIES);
  assert.equal(matrix.cities.length, cities.length - EGRESS_CITIES.length);
  assert.ok(matrix.cities.every((id) => !EGRESS_CITIES.includes(id)));
  assert.ok(matrix.render_cities.every((id) => matrix.cities.includes(id)));
});

test('single-city dispatch accepts a hosted city', () => {
  const matrix = buildRefreshMatrix(cities, 'gliwice');
  assert.deepEqual(matrix.cities, ['gliwice']);
  assert.deepEqual(matrix.blocked_cities, []);
});

test('single-city dispatch rejects unknown and residential-egress cities', () => {
  assert.throws(() => buildRefreshMatrix(cities, 'not-a-city'), /unknown city id/);
  assert.throws(() => buildRefreshMatrix(cities, 'brzeg'), /requires residential egress/);
});
