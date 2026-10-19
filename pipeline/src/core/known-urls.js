// known-urls.js — reusable incremental-crawl helper.
//
// loadKnownSourceUrls(cityId) reads the committed data/<cityId>/properties.json
// and returns a Set of every URL that is already captured, drawn from the
// following fields inside each property's listings[]:
//
//   source_pdf   — primary result-doc URL (Białystok, most cities)
//   source_url   — alternate result-doc URL
//   detail_url   — notice/detail page URL
//   pdf_url      — direct PDF link
//
// On a first run (file missing or unreadable) it returns an empty Set so the
// caller skips nothing and fetches everything normally.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Repo-root data/ directory, resolved relative to this file.
// pipeline/src/core/known-urls.js  →  ../../..  →  repo root
const DATA_DIR = fileURLToPath(new URL('../../../data', import.meta.url));

/**
 * Return the set of all already-captured source URLs for the given city.
 *
 * Collects source_pdf, source_url, detail_url, and pdf_url from every
 * listing entry inside data/<cityId>/properties.json.
 *
 * Fail-safe: returns an empty Set when the file is missing or unreadable
 * (e.g. first run, or the city has not yet been seeded).
 *
 * @param {string} cityId  e.g. 'slupsk', 'bialystok'
 * @param {{includeLand?: boolean, resolvedOnly?: boolean, dataDir?: string}} [options] Include the
 *   separate parcel ledger for mixed streams; default callers retain the
 *   property-only behavior. dataDir supports isolated source validation.
 * @returns {Promise<Set<string>>}
 */
export async function loadKnownSourceUrls(cityId, { includeLand = false, resolvedOnly = false, dataDir = DATA_DIR } = {}) {
  const urls = new Set();
  for (const [filename, field] of [['properties.json', 'properties'], ...(includeLand ? [['land.json', 'plots']] : [])]) {
    const filePath = join(dataDir, cityId, filename);
    if (!existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'));
      const records = Array.isArray(parsed?.[field]) ? parsed[field] : [];
      for (const rec of records) {
        for (const listing of Array.isArray(rec?.listings) ? rec.listings : []) {
          // An archived announcement is not a published result. Mixed boards
          // can add a result attachment later, so callers checking outcomes
          // must keep revisiting unresolved announcements.
          if (resolvedOnly && !['sold', 'unsold', 'no_winner'].includes(listing.outcome)) continue;
          if (listing.source_pdf) urls.add(listing.source_pdf);
          if (listing.source_url) urls.add(listing.source_url);
          if (listing.detail_url) urls.add(listing.detail_url);
          if (listing.pdf_url)    urls.add(listing.pdf_url);
        }
      }
    } catch { /* A missing/bad stream must not discard the other stream's known history. */ }
  }
  return urls;
}
