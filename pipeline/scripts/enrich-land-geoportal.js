// Upgrade each data/<city>/land.json plot's geoportal link from a parcel-SEARCH
// fallback to a PRECISE national-geoportal "identifyParcel" deep-link, by
// resolving the parcel's full TERYT id from its obręb name + number via ULDK
// (uldk.gugik.gov.pl). Idempotent + cached (pipeline/uldk-cache/<city>.json) so
// CI resolves each parcel once. Source-provided map links (e.g. Bytom's SIP) are
// preserved — only the search-fallback links get upgraded; the parcel's resolved
// `dzialka_id` is recorded on every plot it can resolve.
//
//   node scripts/enrich-land-geoportal.js            (all cities)
//   CITY=gliwice node scripts/enrich-land-geoportal.js
//
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cities } from '../src/cities/index.js';
import { resolveTerytId } from '../src/core/uldk.js';
import { nationalGeoportalUrl } from '../src/core/geoportal.js';

const DATA = fileURLToPath(new URL('../../data/', import.meta.url));
const CACHE_DIR = fileURLToPath(new URL('../uldk-cache/', import.meta.url));
const isSearchFallback = (u) => !u || /google\.com\/search/i.test(u);

async function enrichCity(city) {
  if (!city.teryt) return;
  const landPath = join(DATA, city.id, 'land.json');
  if (!existsSync(landPath)) return;
  let data;
  try { data = JSON.parse(await readFile(landPath, 'utf8')); } catch { return; }
  const plots = data.plots || [];
  if (!plots.length) return;

  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${city.id}.json`);
  let cache = {};
  if (existsSync(cachePath)) { try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch { /* fresh */ } }

  // Flush cache + data periodically so a timeout (or interrupt) preserves
  // progress and a re-run resumes (resolved parcels are cached; enriched plots
  // already carry dzialka_id and are skipped).
  const flush = async () => {
    await writeFile(cachePath, JSON.stringify(cache, null, 2) + '\n');
    await writeFile(landPath, JSON.stringify(data, null, 2) + '\n');
  };
  let resolved = 0, fromCache = 0, upgraded = 0, since = 0;
  for (const p of plots) {
    if (p.dzialka_id) continue;               // already precise
    if (!p.obreb || !p.dzialka_nr) continue;  // ULDK needs both
    const parcel = String(p.dzialka_nr).split(',')[0].trim(); // first of a multi-parcel
    const ck = `${p.obreb}|${parcel}`;
    let id;
    if (ck in cache) { id = cache[ck]; fromCache++; }
    else {
      id = await resolveTerytId({ obreb: p.obreb, parcel, terytGmina: city.teryt });
      cache[ck] = id;
      if (id) resolved++;
    }
    if (id) {
      p.dzialka_id = id;
      const precise = nationalGeoportalUrl(id);
      if (precise && isSearchFallback(p.geoportal_url)) { p.geoportal_url = precise; upgraded++; }
    }
    if (++since >= 8) { await flush(); since = 0; }
  }
  await flush();
  console.error(`${city.id}: resolved ${resolved} (+${fromCache} cached) → ${upgraded} precise geoportal links`);
}

const only = (process.env.CITY || '').split(',').map((s) => s.trim()).filter(Boolean);
for (const city of cities) {
  if (only.length && !only.includes(city.id)) continue;
  try { await enrichCity(city); } catch (err) { console.error(`${city.id}: enrich failed (${err.message})`); }
}
