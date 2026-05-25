// Gliwice-specific enrichment: backfills the wadium (deposit) deadline and the
// viewing date for each active listing by fetching its detail page once and
// caching the result in pipeline/detail-cache/.
//
// Extracted verbatim from refresh.js — this is a per-city concern, not a
// shared one, because the regexes and detail-page shape are Gliwice-specific.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getText } from '../../core/fetch.js';
import { urlCacheKey } from '../../core/hash.js';

const DETAIL_CACHE_DIR = fileURLToPath(new URL('../../../detail-cache/', import.meta.url));

const WADIUM_RE =
  /wniesienie\s+do\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*wadium/i;
const VIEWING_RE =
  /(?:Termin\s+udost[ęe]pnienia|udost[ęe]pnienia\s+lokalu)[^.]*?(\d{1,2})\.(\d{1,2})\.(\d{4})/i;

/**
 * Mutates each active listing in place, adding `wadium_deadline` and
 * `viewing_date` (ISO date strings or null).
 * @param {Array} active
 */
export async function augmentActiveWithWadium(active) {
  let upgraded = 0;
  for (const a of active) {
    if (!a.detail_url) continue;
    const cachePath = join(DETAIL_CACHE_DIR, urlCacheKey(a.detail_url) + '.json');
    let rec = null;
    if (existsSync(cachePath)) {
      try { rec = JSON.parse(await readFile(cachePath, 'utf8')); } catch {}
    }
    if (!rec || !('wadium_deadline' in rec) || !('viewing_date' in rec)) {
      try {
        const html = await getText(a.detail_url);
        const flat = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const wm = WADIUM_RE.exec(flat);
        const wadium_deadline = wm
          ? `${wm[3]}-${wm[2].padStart(2, '0')}-${wm[1].padStart(2, '0')}`
          : null;
        const vm = VIEWING_RE.exec(flat);
        const viewing_date = vm
          ? `${vm[3]}-${vm[2].padStart(2, '0')}-${vm[1].padStart(2, '0')}`
          : null;
        rec = { ...(rec || {}), wadium_deadline, viewing_date, fetched_at: new Date().toISOString() };
        await writeFile(cachePath, JSON.stringify(rec, null, 2));
        upgraded++;
      } catch (err) {
        console.error('  WARN wadium/viewing fetch failed for', a.detail_url, err.message);
      }
    }
    a.wadium_deadline = rec?.wadium_deadline || null;
    a.viewing_date = rec?.viewing_date || null;
  }
  if (upgraded) console.error(`  refetched ${upgraded} detail page(s) to backfill wadium+viewing`);
}
