// Build the city list that can safely run on GitHub-hosted Azure runners.
//
// Adapters marked needsResidentialEgress remain registered and published, but
// are deliberately held out of hosted automation. Their last-good data remains
// published and a short-lived stale-only health window makes the unresolved
// hosted-access gap fail visibly instead of becoming a permanent blind spot.

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { cities } from '../src/cities/index.js';

const DEFAULT_SHARD_WEIGHT = 5;
const MAX_SHARDS = 240;

// These adapters invoke OCR directly in their city implementation. Keep them
// alone unless they share a source host, just as render-backed adapters are.
// This list is an operational scheduling hint, not a coverage declaration.
export const HEAVY_CITY_IDS = new Set([
  'belchatow', 'biala-podlaska', 'bytom', 'choszczno', 'gliwice',
  'golub-dobrzyn', 'gorzow-wielkopolski', 'gostyn', 'grudziadz', 'kolbuszowa',
  'konskie', 'krosno-odrzanskie', 'kwidzyn', 'lipsko', 'miedzyrzecz',
  'ostroleka', 'oswiecim', 'pajeczno', 'plock', 'pultusk', 'sopot',
  'strzelce-krajenskie', 'sulecin', 'swietochlowice', 'szczecin',
  'tomaszow-mazowiecki', 'wabrzezno', 'warszawa', 'wegorzewo', 'wegrow',
  'wloclawek', 'wschowa', 'zabkowice-slaskie', 'znin',
]);

function shardCities(hosted, maxWeight) {
  const registryOrder = new Map(hosted.map((city, index) => [city.id, index]));
  const byHost = new Map();
  for (const city of hosted) {
    const hostKey = city.host || `city:${city.id}`;
    if (!byHost.has(hostKey)) byHost.set(hostKey, []);
    byHost.get(hostKey).push(city);
  }
  const groups = [...byHost.entries()].map(([host, group]) => ({
    host,
    cities: group,
    weight: group.reduce((total, city) => total + (
      city.needsRender || HEAVY_CITY_IDS.has(city.id) ? maxWeight : 1
    ), 0),
  })).sort((a, b) => b.weight - a.weight
    || registryOrder.get(a.cities[0].id) - registryOrder.get(b.cities[0].id));

  const bins = [];
  for (const group of groups) {
    const dedicated = group.weight >= maxWeight;
    const bin = dedicated ? null : bins.find((candidate) => (
      !candidate.dedicated && candidate.weight + group.weight <= maxWeight
    ));
    if (bin) {
      bin.groups.push(group); bin.weight += group.weight;
    } else {
      bins.push({ groups: [group], weight: group.weight, dedicated });
    }
  }

  const ordered = bins.sort((a, b) => {
    const firstA = Math.min(...a.groups.flatMap((group) => group.cities.map((city) => registryOrder.get(city.id))));
    const firstB = Math.min(...b.groups.flatMap((group) => group.cities.map((city) => registryOrder.get(city.id))));
    return firstA - firstB;
  });
  return ordered.map((bin, index) => {
    const shard = bin.groups.flatMap((group) => group.cities)
      .sort((a, b) => registryOrder.get(a.id) - registryOrder.get(b.id));
    return {
      id: `shard-${String(index + 1).padStart(3, '0')}`,
      cities: shard.map((city) => city.id),
      hosts: [...new Set(shard.map((city) => city.host).filter(Boolean))],
      needs_render: shard.some((city) => city.needsRender),
      runtime_weight: bin.weight,
    };
  });
}

export function buildRefreshMatrix(registry, onlyCity = '', { maxShardWeight = DEFAULT_SHARD_WEIGHT } = {}) {
  if (!Number.isInteger(maxShardWeight) || maxShardWeight < 1) throw new Error('maxShardWeight must be a positive integer');
  const selected = registry.filter((city) => !onlyCity || city.id === onlyCity);
  if (onlyCity && selected.length === 0) {
    throw new Error(`unknown city id: ${onlyCity}`);
  }

  const egressCities = selected.filter((city) => city.needsResidentialEgress);
  if (onlyCity && egressCities.length > 0) {
    throw new Error(
      `${onlyCity} requires residential egress and is excluded from hosted-only automation`,
    );
  }

  const hosted = selected.filter((city) => !city.needsResidentialEgress);
  const shards = shardCities(hosted, maxShardWeight);
  if (shards.length > MAX_SHARDS) throw new Error(`hosted refresh requires ${shards.length} shards (limit ${MAX_SHARDS})`);
  return {
    cities: hosted.map((city) => city.id),
    shards,
    render_cities: hosted.filter((city) => city.needsRender).map((city) => city.id),
    blocked_cities: egressCities.map((city) => city.id),
  };
}

function main() {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required');

  const matrix = buildRefreshMatrix(cities, process.env.ONLY_CITY || '', {
    maxShardWeight: Number(process.env.MAX_SHARD_WEIGHT || DEFAULT_SHARD_WEIGHT),
  });
  for (const [name, value] of Object.entries(matrix)) {
    appendFileSync(outputPath, `${name}=${JSON.stringify(value)}\n`, 'utf8');
  }

  console.log(`Hosted refresh matrix: ${matrix.cities.length} cities`);
  console.log(`Hosted refresh shards: ${matrix.shards.length}`);
  if (matrix.blocked_cities.length > 0) {
    console.log(`Operator-managed residential-egress cities excluded: ${matrix.blocked_cities.join(', ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
