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
import { nationalGeoportalUrl, parcelSearchUrl } from '../src/core/geoportal.js';
import { splitParcels } from '../src/core/build-land.js';

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
  let resolved = 0, fromCache = 0, links = 0, since = 0;
  for (const p of plots) {
    // Resolve EACH parcel of the plot ("263/2, 263/6" → two links). Older
    // land.json may predate the `parcels` field — derive it from dzialka_nr.
    const parcels = (p.parcels && p.parcels.length) ? p.parcels : splitParcels(p.dzialka_nr);
    if (!parcels.length || !p.obreb) continue;
    let touched = false;
    for (const parcel of parcels) {
      if (parcel.dzialka_id && parcel.geoportal_url) continue; // already resolved
      const ck = `${p.obreb}|${parcel.nr}`;
      let id;
      if (ck in cache) { id = cache[ck]; fromCache++; }
      else {
        id = await resolveTerytId({ obreb: p.obreb, parcel: parcel.nr, terytGmina: city.teryt });
        cache[ck] = id;
        if (id) resolved++;
      }
      if (id) { parcel.dzialka_id = id; parcel.geoportal_url = nationalGeoportalUrl(id); }
      else { parcel.geoportal_url = parcelSearchUrl({ nr: parcel.nr, obreb: p.obreb, label: city.label }); }
      links++;
      touched = true;
    }
    p.parcels = parcels;
    // Back-compat: keep a top-level dzialka_id + geoportal_url (first resolved
    // parcel) so any consumer not reading `parcels` still gets a precise link.
    const first = parcels.find((x) => x.dzialka_id);
    if (first) {
      p.dzialka_id = first.dzialka_id;
      if (isSearchFallback(p.geoportal_url)) p.geoportal_url = first.geoportal_url;
    }
    if (touched && ++since >= 8) { await flush(); since = 0; }
  }
  await flush();
  console.error(`${city.id}: resolved ${resolved} new (+${fromCache} cached), ${links} parcel link(s) this run`);
}

const only = (process.env.CITY || '').split(',').map((s) => s.trim()).filter(Boolean);
for (const city of cities) {
  if (only.length && !only.includes(city.id)) continue;
  try { await enrichCity(city); } catch (err) { console.error(`${city.id}: enrich failed (${err.message})`); }
}
