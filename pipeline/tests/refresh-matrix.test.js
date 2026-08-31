import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cities } from '../src/cities/index.js';
import { buildRefreshMatrix } from '../scripts/refresh-matrix.js';

const EGRESS_CITIES = ['raciborz'];

test('hosted refresh matrix excludes only residential-egress adapters', () => {
  const matrix = buildRefreshMatrix(cities);

  assert.deepEqual(matrix.blocked_cities.sort(), EGRESS_CITIES);
  assert.deepEqual(matrix.egress_cities.sort(), EGRESS_CITIES);
  assert.equal(matrix.cities.length, cities.length - EGRESS_CITIES.length);
  assert.ok(matrix.cities.every((id) => !EGRESS_CITIES.includes(id)));
  assert.ok(matrix.render_cities.every((id) => matrix.cities.includes(id)));
});

test('single-city dispatch accepts a hosted city', () => {
  const matrix = buildRefreshMatrix(cities, 'gliwice');
  assert.deepEqual(matrix.cities, ['gliwice']);
  assert.deepEqual(matrix.blocked_cities, []);
  assert.deepEqual(matrix.egress_cities, []);
});

test('single-city dispatch rejects unknown and residential-egress cities', () => {
  assert.throws(() => buildRefreshMatrix(cities, 'not-a-city'), /unknown city id/);
  assert.throws(() => buildRefreshMatrix(cities, 'raciborz'), /requires residential egress/);
});

test('configured restricted egress includes flagged adapters and permits a targeted dispatch', () => {
  const full = buildRefreshMatrix(cities, '', true);
  assert.equal(full.cities.length, cities.length);
  assert.deepEqual(full.blocked_cities, []);
  assert.deepEqual(full.egress_cities.sort(), EGRESS_CITIES);

  const targeted = buildRefreshMatrix(cities, 'raciborz', true);
  assert.deepEqual(targeted.cities, ['raciborz']);
  assert.deepEqual(targeted.egress_cities, ['raciborz']);
  assert.deepEqual(targeted.blocked_cities, []);
});
