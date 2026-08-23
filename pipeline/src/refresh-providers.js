// Institutional seller pipeline. Its row-based output is deliberately separate
// from data/<city>: provider auctions must never change municipal medians, city
// health counts, or the extension's city contract.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setDefaultResultOrder } from 'node:dns';

import { providers } from './providers/index.js';
import { mergeProviderListings, providerCounts } from './providers/common.js';

try { setDefaultResultOrder('ipv4first'); } catch { /* Node <18 */ }

const SCHEMA_VERSION = 1;
const DATA_DIR = fileURLToPath(new URL('../../data/providers/', import.meta.url));
const ONLY_PROVIDER = process.env.PROVIDER || '';

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { return fallback; }
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function refreshProvider(provider) {
  const dir = join(DATA_DIR, provider.id);
  const listingsPath = join(dir, 'listings.json');
  const metaPath = join(dir, 'meta.json');
  const previousDoc = await readJson(listingsPath, { listings: [] });
  const previous = previousDoc.listings || [];

  console.error(`\n=== ${provider.label} (${provider.id}) ===`);
  const fresh = await provider.crawl(previous);
  if (fresh.length < provider.minimum_fresh_rows) {
    throw new Error(`crawl returned only ${fresh.length} rows (minimum ${provider.minimum_fresh_rows}); preserving ${previous.length} previous rows`);
  }

  const generatedAt = new Date().toISOString();
  const listings = mergeProviderListings(previous, fresh);
  const counts = providerCounts(listings);
  const meta = {
    schema_version: SCHEMA_VERSION,
    provider: provider.id,
    label: provider.label,
    seller_type: provider.seller_type,
    host: provider.host,
    source_url: provider.source_url,
    minimum_fresh_rows: provider.minimum_fresh_rows,
    generated_at: generatedAt,
    fresh_rows: fresh.length,
    ...counts,
  };
  await mkdir(dir, { recursive: true });
  await writeJson(listingsPath, {
    schema_version: SCHEMA_VERSION,
    provider: provider.id,
    generated_at: generatedAt,
    listings,
  });
  await writeJson(metaPath, meta);
  console.error(`  wrote ${counts.total_listings} rows (${counts.active_auctions} active, ${counts.historical_auctions} historical)`);
  return meta;
}

async function buildIndex() {
  const entries = [];
  for (const provider of providers) {
    const meta = await readJson(join(DATA_DIR, provider.id, 'meta.json'), null);
    if (meta) entries.push(meta);
  }
  const generatedAt = entries.map((entry) => entry.generated_at).filter(Boolean).sort().at(-1) || new Date().toISOString();
  await mkdir(DATA_DIR, { recursive: true });
  await writeJson(join(DATA_DIR, 'index.json'), {
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    providers: entries.map((entry) => ({
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
    })),
  });
}

let failed = false;
for (const provider of providers.filter((candidate) => !ONLY_PROVIDER || candidate.id === ONLY_PROVIDER)) {
  try { await refreshProvider(provider); }
  catch (error) {
    failed = true;
    console.error(`  ERROR ${provider.id}: ${error.message}`);
  }
}
if (ONLY_PROVIDER && !providers.some((provider) => provider.id === ONLY_PROVIDER)) {
  throw new Error(`unknown PROVIDER=${ONLY_PROVIDER}`);
}
await buildIndex();
if (failed) process.exitCode = 1;
