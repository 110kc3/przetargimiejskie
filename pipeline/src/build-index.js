// Builds data/index.json from the city registry + each city's committed
// data/<city>/meta.json — standalone so the CI aggregate job can rebuild the
// index AFTER the per-city matrix jobs have each committed their own
// data/<city>/ directory. The single publisher also overlays each shard's
// signed-off outcome so a failed attempt is visible without replacing the
// city's last-good data files.
//
// Disk-based is equivalent to refresh.js's in-memory build: refreshCity
// writes meta.json on success and leaves the previous meta.json in place on
// failure/outage — exactly the stale-fallback main() applies. A city with no
// meta.json on disk gets zero counts, same as before.
//
// Run with:  node src/build-index.js   (from pipeline/)

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cities } from './cities/index.js';
import { validationPolicy } from '../scripts/validation-policy.js';

const SCHEMA_VERSION = 1;
const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

async function observedAssets(city, meta) {
  if (Array.isArray(meta?.monitored_assets) && meta.monitored_assets.length) return meta.monitored_assets;
  const names = new Set();
  const mapped = {
    mieszkalny: 'residential', uzytkowy: 'commercial', garaz: 'garage',
    zabudowana: 'building', unknown: 'unknown',
  };
  try {
    const properties = JSON.parse(await readFile(join(DATA_DIR, city, 'properties.json'), 'utf8')).properties || [];
    for (const property of properties) names.add(mapped[property.kind] || property.kind || 'unknown');
  } catch { /* not published yet */ }
  if ((meta?.land_plots || 0) > 0) names.add('land');
  return [...names].sort();
}

export function operationalFields({ outcome = null, previous = null, meta = null,
  validationStatus, sourceDegraded = false, assets = [] }) {
  const refreshStatus = outcome?.status || previous?.last_refresh_status || null;
  const degraded = validationStatus === 'quarantined' || sourceDegraded
    || meta?.stale === true || refreshStatus === 'failed';
  return {
    coverage_status: degraded
      ? 'degraded' : (meta?.valid_empty ? 'valid_empty' : (assets.length ? 'monitored' : 'unknown')),
    last_source_attempt_at: outcome?.metrics?.attempted_at || meta?.last_source_attempt_at
      || previous?.last_source_attempt_at || null,
    last_successful_source_check_at: meta?.last_successful_source_check_at || meta?.generated_at
      || previous?.last_successful_source_check_at || null,
    last_refresh_status: refreshStatus,
    last_refresh_duration_ms: outcome?.metrics?.duration_ms ?? previous?.last_refresh_duration_ms ?? null,
    last_refresh_request_count: outcome?.metrics?.request_count ?? previous?.last_refresh_request_count ?? null,
  };
}

export async function buildIndexFromDisk({ outcomes = [] } = {}) {
  const knownIds = new Set(cities.map((city) => city.id));
  const outcomesById = new Map();
  for (const outcome of outcomes) {
    if (!outcome || !knownIds.has(outcome.id) || outcomesById.has(outcome.id)
        || !['ready', 'failed'].includes(outcome.status)
        || (outcome.metrics && (!Number.isSafeInteger(outcome.metrics.duration_ms)
          || outcome.metrics.duration_ms < 0
          || !Number.isSafeInteger(outcome.metrics.request_count)
          || outcome.metrics.request_count < 0
          || typeof outcome.metrics.attempted_at !== 'string'
          || Number.isNaN(Date.parse(outcome.metrics.attempted_at))))) {
      throw new Error(`invalid or duplicate refresh outcome: ${JSON.stringify(outcome)}`);
    }
    outcomesById.set(outcome.id, outcome);
  }
  let previousById = new Map();
  try {
    const previous = JSON.parse(await readFile(join(DATA_DIR, 'index.json'), 'utf8'));
    previousById = new Map((previous.cities || []).map((entry) => [entry.id, entry]));
  } catch { /* first publication */ }

  const entries = [];
  for (const c of cities) {
    let m = null;
    try {
      m = JSON.parse(await readFile(join(DATA_DIR, c.id, 'meta.json'), 'utf8'));
    } catch {
      /* city not yet published — zeros below */
    }
    const validation = validationPolicy(c.id);
    const sourceDegraded = Object.values(m?.source_checks || {}).some((source) => source?.status === 'degraded');
    const assets = await observedAssets(c.id, m);
    const outcome = outcomesById.get(c.id);
    const previous = previousById.get(c.id);
    const operational = operationalFields({
      outcome, previous, meta: m, validationStatus: validation.status, sourceDegraded, assets,
    });
    entries.push({
      id: c.id,
      label: c.label,
      voivodeship: c.voivodeship,
      authority: c.authority,
      host: c.host,
      unique_properties: m?.unique_properties ?? 0,
      active_listings: m?.active_listings ?? 0,
      active_auctions: m?.active_auctions ?? 0,
      archived_auctions: m?.archived_auctions ?? 0,
      wykaz_entries: m?.wykaz_entries ?? 0,
      land_plots: m?.land_plots ?? 0,
      validation_status: validation.status,
      validation_reason: validation.reason,
      validation_review_due: validation.review_due,
      monitored_assets: assets,
      ...operational,
    });
  }
  const index = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    cities: entries,
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    join(DATA_DIR, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
  );
  return index;
}

// CLI entry (node src/build-index.js).
if (process.argv[1] && process.argv[1].endsWith('build-index.js')) {
  const outcomePath = process.env.CITY_OUTCOMES_PATH;
  const outcomes = outcomePath
    ? JSON.parse(await readFile(outcomePath, 'utf8'))
    : [];
  buildIndexFromDisk({ outcomes })
    .then((i) => console.error(`data/index.json written (${i.cities.length} cities)`))
    .catch((err) => {
      console.error('build-index FAILED:', err);
      process.exitCode = 1;
    });
}
