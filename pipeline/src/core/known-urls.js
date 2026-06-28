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
 * @returns {Promise<Set<string>>}
 */
export async function loadKnownSourceUrls(cityId) {
  const filePath = join(DATA_DIR, cityId, 'properties.json');
  if (!existsSync(filePath)) return new Set();
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed?.properties) ? parsed.properties : [];
    const urls = new Set();
    for (const rec of records) {
      for (const listing of Array.isArray(rec?.listings) ? rec.listings : []) {
        if (listing.source_pdf) urls.add(listing.source_pdf);
        if (listing.source_url) urls.add(listing.source_url);
        if (listing.detail_url) urls.add(listing.detail_url);
        if (listing.pdf_url)    urls.add(listing.pdf_url);
      }
    }
    return urls;
  } catch {
    return new Set();
  }
}
