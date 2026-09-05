#!/usr/bin/env node

// Trusted publisher-side index rebuild. It intentionally imports no crawler or
// third-party dependency, so a repository-write token never shares a process
// with downloaded code or source-network access.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../../data/providers/', import.meta.url));
const ids = ['pkp', 'amw'];
const entries = [];

for (const id of ids) {
  const meta = JSON.parse(await readFile(join(DATA_DIR, id, 'meta.json'), 'utf8'));
  if (meta.provider !== id) throw new Error(`provider identity mismatch: ${id}`);
  entries.push(meta);
}

const generatedAt = entries
  .map((entry) => entry.generated_at)
  .filter(Boolean)
  .sort()
  .at(-1);
if (!generatedAt) throw new Error('provider metadata has no generated_at value');

const providers = entries.map((entry) => ({
  id: entry.provider,
  label: entry.label,
  seller_type: entry.seller_type,
  host: entry.host,
  source_url: entry.source_url,
  minimum_fresh_rows: entry.minimum_fresh_rows,
  generated_at: entry.generated_at,
  total_listings: entry.total_listings,
  active_auctions: entry.active_auctions,
  historical_auctions: entry.historical_auctions,
}));

await writeFile(join(DATA_DIR, 'index.json'), `${JSON.stringify({
  schema_version: 1,
  generated_at: generatedAt,
  providers,
}, null, 2)}\n`, 'utf8');
console.log(`provider index: ${providers.length} feeds`);
