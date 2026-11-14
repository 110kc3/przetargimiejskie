import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cities } from '../src/cities/index.js';
import { readFileSync } from 'node:fs';

import { buildRefreshMatrix, HEAVY_CITY_IDS } from '../scripts/refresh-matrix.js';
import { MAX_CITIES_PER_SHARD, assertCities } from '../scripts/refresh-shard.js';

const EGRESS_CITIES = ['pszczyna', 'raciborz'];

test('hosted refresh matrix excludes only residential-egress adapters', () => {
  const matrix = buildRefreshMatrix(cities);

  assert.deepEqual(matrix.blocked_cities.sort(), EGRESS_CITIES);
  assert.equal(matrix.cities.length, cities.length - EGRESS_CITIES.length);
  assert.ok(matrix.cities.every((id) => !EGRESS_CITIES.includes(id)));
  assert.ok(matrix.render_cities.every((id) => matrix.cities.includes(id)));
  assert.deepEqual(matrix.shards.flatMap((shard) => shard.cities).sort(), [...matrix.cities].sort());
  assert.ok(matrix.shards.length < matrix.cities.length / 2);
  assert.ok(matrix.shards.every((shard) => shard.cities.length > 0));

  const citiesPerHost = new Map();
  for (const city of cities) citiesPerHost.set(city.host, (citiesPerHost.get(city.host) || 0) + 1);
  const hostShard = new Map();
  for (const shard of matrix.shards) {
    for (const id of shard.cities) {
      const city = cities.find((candidate) => candidate.id === id);
      if (!city.host || citiesPerHost.get(city.host) > MAX_CITIES_PER_SHARD) continue;
      assert.ok(!hostShard.has(city.host) || hostShard.get(city.host) === shard.id);
      hostShard.set(city.host, shard.id);
    }
  }
  for (const id of HEAVY_CITY_IDS) {
    const shard = matrix.shards.find((candidate) => candidate.cities.includes(id));
    if (shard) assert.ok(shard.runtime_weight >= 5);
  }
});

test('single-city dispatch accepts a hosted city', () => {
  const matrix = buildRefreshMatrix(cities, 'gliwice');
  assert.deepEqual(matrix.cities, ['gliwice']);
  assert.deepEqual(matrix.blocked_cities, []);
  assert.deepEqual(matrix.shards.map((shard) => shard.cities), [['gliwice']]);
});

test('shared hosts stay in one shard and small cities are packed to the weight bound', () => {
  const registry = [
    { id: 'a', host: 'same.example' },
    { id: 'b', host: 'same.example' },
    { id: 'c', host: 'c.example' },
    { id: 'd', host: 'd.example' },
    { id: 'e', host: 'e.example' },
    { id: 'f', host: 'f.example' },
  ];
  const matrix = buildRefreshMatrix(registry, '', { maxShardWeight: 3 });
  assert.equal(matrix.shards.length, 2);
  assert.ok(matrix.shards.some((shard) => shard.cities.includes('a') && shard.cities.includes('b')));
  assert.ok(matrix.shards.every((shard) => shard.runtime_weight <= 3));
});

test('single-city dispatch rejects unknown and residential-egress cities', () => {
  assert.throws(() => buildRefreshMatrix(cities, 'not-a-city'), /unknown city id/);
  assert.throws(() => buildRefreshMatrix(cities, 'pszczyna'), /excluded from hosted-only automation/);
  assert.throws(() => buildRefreshMatrix(cities, 'raciborz'), /excluded from hosted-only automation/);
});

function syntheticCities(count, host) {
  return Array.from({ length: count }, (_, index) => ({ id: `${host}-${index}`, host }));
}

test('a host group larger than the shard limit is split into runnable shards', () => {
  const matrix = buildRefreshMatrix(syntheticCities(46, 'bip.example.pl'));

  assert.equal(matrix.cities.length, 46);
  assert.ok(matrix.shards.every((shard) => shard.cities.length <= MAX_CITIES_PER_SHARD));
  assert.deepEqual(matrix.shards.flatMap((shard) => shard.cities).sort(), matrix.cities.slice().sort());
});

test('every shard of the real registry satisfies the shard runner contract', () => {
  const matrix = buildRefreshMatrix(cities);
  const assigned = matrix.shards.flatMap((shard) => shard.cities);

  assert.equal(new Set(assigned).size, assigned.length);
  assert.equal(assigned.length, matrix.cities.length);
  for (const shard of matrix.shards) {
    assert.doesNotThrow(() => assertCities(shard.cities), shard.id);
  }
});

test('the shard step timeout covers the shard budget with margin for post-processing', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/refresh.yml', import.meta.url), 'utf8');
  const budgetMs = Number(workflow.match(/SHARD_BUDGET_MS: '(\d+)'/)[1]);
  const stepTimeoutMinutes = Number(workflow.match(/Run isolated city shard[\s\S]*?timeout-minutes: (\d+)/)[1]);

  assert.ok(budgetMs + 10 * 60_000 <= stepTimeoutMinutes * 60_000);
});
