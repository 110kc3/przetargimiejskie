// Builds data/index.json from the city registry + each city's committed
// data/<city>/meta.json — standalone so the CI aggregate job can rebuild the
// index AFTER the per-city matrix jobs have each committed their own
// data/<city>/ directory (the matrix jobs themselves skip the index to avoid
// racing on one shared file; see .github/workflows/refresh.yml).
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

const SCHEMA_VERSION = 1;
const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

export async function buildIndexFromDisk() {
  const entries = [];
  for (const c of cities) {
    let m = null;
    try {
      m = JSON.parse(await readFile(join(DATA_DIR, c.id, 'meta.json'), 'utf8'));
    } catch {
      /* city not yet published — zeros below */
    }
    entries.push({
      id: c.id,
      label: c.label,
      authority: c.authority,
      host: c.host,
      unique_properties: m?.unique_properties ?? 0,
      active_listings: m?.active_listings ?? 0,
      active_auctions: m?.active_auctions ?? 0,
      archived_auctions: m?.archived_auctions ?? 0,
      wykaz_entries: m?.wykaz_entries ?? 0,
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
  buildIndexFromDisk()
    .then((i) => console.error(`data/index.json written (${i.cities.length} cities)`))
    .catch((err) => {
      console.error('build-index FAILED:', err);
      process.exitCode = 1;
    });
}
