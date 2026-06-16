// Top-level orchestrator. Loops the city registry (src/cities/index.js) and
// builds, per city:
//
//   data/<city>/properties.json   one entry per unique (street, building, apt)
//   data/<city>/active.json       current active listings + wykaz announcements
//   data/<city>/meta.json         provenance: when this ran, parser version, counts
//
// plus a top-level data/index.json listing every city and its headline counts.
//
// Run with:  npm run refresh   (from pipeline/)

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setDefaultResultOrder } from 'node:dns';

// Prefer IPv4 for all DNS lookups. Some municipal BIPs publish an AAAA record
// that isn't routable from the GitHub Actions runner (Azure), which made fetch
// hang on connect (UND_ERR_CONNECT_TIMEOUT) for e.g. bip.swietochlowice.pl while
// the host loaded fine over IPv4 from a browser. ipv4first makes Node try the A
// record first. Harmless for hosts that already work over IPv4.
try { setDefaultResultOrder('ipv4first'); } catch { /* older node */ }

import { cities } from './cities/index.js';
import { ocrPdf } from './core/ocr-pdf.js';
import { pdfText } from './core/pdf-text.js';
import { buildCityData, healStreetVariants, todayWarsaw } from './core/build-properties.js';
import { buildLand } from './core/build-land.js';
import { LAND_KIND } from './core/classify-kind.js';
import { mergeProperties, archivePastActive } from './core/merge-history.js';
import { closeBrowser } from './core/render.js';

// History accumulation: merge each run with the previously-committed
// properties.json so a record the source later removes is retained (not lost).
// Set MERGE_HISTORY=0 to disable (fresh rebuild); also achieved per-city by
// deleting that city's data/<city>/properties.json before a run.
const MERGE_HISTORY = process.env.MERGE_HISTORY !== '0';

const SCHEMA_VERSION = 1;
const LAND_SCHEMA_VERSION = 1;
const PARSER_VERSION = '0.2.0';
const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// Pipeline floor: drop historical records whose auction year is older than
// this. Active listings and wykaz pre-announcements are never dropped (those
// are current/upcoming). The extension layers a soft per-user UI window on
// top of this floor (default = current_year - 3, see extension/settings.js)
// — so this floor should stay broader than that UI default to leave room.
// Override with `MIN_HISTORY_YEAR=YYYY npm run refresh`.
const PIPELINE_MIN_HISTORY_YEAR =
  Number(process.env.MIN_HISTORY_YEAR) || 2020;

// Crawl, OCR/parse, enrich and write one city's three JSON files.
async function refreshCity(city) {
  console.error(`\n=== ${city.label} (${city.id}) ===`);

  console.error('Crawling result documents ...');
  const docRefs = await city.crawlResultDocs();
  console.error(`Found ${docRefs.length} result documents.\n`);

  console.error('OCR + parsing result documents (cached entries are instant) ...');
  const allRecords = [];
  let parsedNoteCount = 0;
  for (const ref of docRefs) {
    let text;
    try {
      // 'pdf' sources are scanned images and need OCR; other sources (html,
      // docx) supply text directly on the ref.
      text = city.source === 'pdf' ? await ocrPdf(ref.pdf_url) : city.source === 'pdf-text' ? await pdfText(ref.pdf_url) : ref.text;
    } catch (err) {
      console.error(`  ERROR OCR ${ref.pdf_url}: ${err.message}`);
      continue;
    }
    const recs = city.parseResultDoc(text, ref.auction_date, ref.pdf_url);
    if (recs.length === 0) {
      console.error(`  WARN ${ref.auction_date}: parser returned 0 records from ${ref.pdf_url}`);
    }
    for (const r of recs) parsedNoteCount += r.notes.length;
    allRecords.push(...recs);
  }
  const beforeFloor = allRecords.length;
  // Apply the pipeline floor. Records with no auction_date pass through —
  // they're rare (parser noise) and harmless; the extension's soft window
  // will hide them too if they fall outside.
  const floored = allRecords.filter(
    (r) => !r.auction_date || Number(r.auction_date.slice(0, 4)) >= PIPELINE_MIN_HISTORY_YEAR,
  );
  allRecords.length = 0;
  allRecords.push(...floored);
  console.error(
    `Parsed ${beforeFloor} auction records, kept ${allRecords.length} after pipeline floor (>= ${PIPELINE_MIN_HISTORY_YEAR}) — ${parsedNoteCount} parser notes.\n`,
  );

  console.error('Crawling active listings + wykaz ...');
  const { listings: active, wykaz, land = [] } = await city.crawlActive();
  console.error(`Got ${active.length} active listings, ${wykaz.length} wykaz entries.\n`);

  // Partition LAND (kind 'grunt') out of the address-keyed streams: land has no
  // street|building|apt, so it must never enter build-properties' property map.
  // Collected here (+ any land the adapter returned explicitly via `land`) and
  // written to the SEPARATE data/<city>/land.json by buildLand below. Houses
  // (kind 'zabudowana') DO have addresses and stay in the flat streams.
  const crawledActiveCount = active.length;
  const landRecords = [...land];
  for (const arr of [active, allRecords]) {
    const keep = [];
    for (const x of arr) (x.kind === LAND_KIND ? landRecords : keep).push(x);
    arr.length = 0;
    arr.push(...keep);
  }
  if (landRecords.length) {
    console.error(`  partitioned ${landRecords.length} land record(s) → land.json`);
  }

  // Optional per-city enrichment of the active listings (e.g. wadium dates).
  if (city.enrichActive) await city.enrichActive(active);

  // Optional per-city unit-area enrichment from detail pages.
  let detailAreas = new Map();
  if (city.crawlDetailAreas) {
    try {
      detailAreas = await city.crawlDetailAreas();
    } catch (err) {
      console.error('  WARN: detail-page enrichment failed:', err.message);
    }
  }

  const built = buildCityData({ allRecords, active, wykaz, detailAreas });
  let properties = built.properties;

  // Read the previously-committed data (used by both the history merge and the
  // preserve-on-empty safety net below).
  const propPath = join(DATA_DIR, city.id, 'properties.json');
  const metaPath = join(DATA_DIR, city.id, 'meta.json');
  let prevProperties = [];
  if (existsSync(propPath)) {
    try { prevProperties = JSON.parse(await readFile(propPath, 'utf8'))?.properties || []; }
    catch { prevProperties = []; }
  }

  // SAFETY NET — preserve on empty. A crawl that produced absolutely nothing
  // (no active listings, no result records, no wykaz) almost always means the
  // source BIP was down (5xx / timeout / proxy error), NOT that every auction
  // genuinely disappeared. If we have already published data for this city, keep
  // it: skip the write entirely so the last-good listings (current + archive)
  // stay live, and reuse the previous meta for the index. The source recovering
  // on a later run writes correct data again (including dropping ended auctions).
  // A genuinely-empty city with no prior data still writes normally.
  // Use the PRE-floor record count: a city whose entire history is older than
  // MIN_HISTORY_YEAR still had a perfectly healthy crawl — only a crawl that
  // saw literally nothing indicates a source outage.
  const crawlEmpty = crawledActiveCount === 0 && beforeFloor === 0 && wykaz.length === 0 && landRecords.length === 0;
  if (crawlEmpty && prevProperties.length > 0) {
    console.error(
      `  ${city.id}: crawl returned EMPTY but ${prevProperties.length} properties were previously published — treating as a source outage. Preserving existing data.`,
    );
    let prevMeta = null;
    try { prevMeta = JSON.parse(await readFile(metaPath, 'utf8')); } catch { /* none */ }

    // Even while preserving, AGE OUT concluded auctions. Some boards (e.g. ZGM
    // Rybnik) legitimately empty out after an auction day — every announcement
    // is removed until the next batch. Without this, the preserved listings
    // stay frozen at outcome 'active' with a past date forever, and the UI
    // shows them NOWHERE (the active view date-filters them; the archive view
    // only shows concluded outcomes). A past auction date means the auction is
    // over regardless of whether the source is down or just empty, so this
    // reclassification is always safe. Idempotent: next run ages out 0 and
    // skips the write again.
    const aged = archivePastActive(prevProperties, todayWarsaw());
    if (aged === 0) {
      console.error('  nothing to age out; skipping write.');
      return prevMeta
        ? { ...prevMeta, city: city.id, stale: true }
        : { schema_version: SCHEMA_VERSION, city: city.id, unique_properties: prevProperties.length,
            active_listings: 0, active_auctions: 0, archived_auctions: 0, wykaz_entries: 0, stale: true };
    }
    console.error(`  aged out ${aged} past-dated preserved listings (active → archived); rewriting data files.`);

    let activeAuctions = 0;
    let archivedAuctions = 0;
    for (const p of prevProperties) {
      for (const l of p.listings || []) {
        if (l.outcome === 'active') activeAuctions++;
        else if (l.outcome === 'archived' || l.outcome === 'sold' || l.outcome === 'unsold' || l.outcome === 'no_winner') archivedAuctions++;
      }
    }
    const cityDir = join(DATA_DIR, city.id);
    await mkdir(cityDir, { recursive: true });
    await writeFile(
      join(cityDir, 'properties.json'),
      JSON.stringify({ schema_version: SCHEMA_VERSION, city: city.id, properties: prevProperties }, null, 2) + '\n',
    );
    // Mirror the aging in active.json (the popup's live snapshot): drop
    // past-dated rows, keep dateless/future ones exactly as last published.
    try {
      const activePath = join(cityDir, 'active.json');
      const prevActive = JSON.parse(await readFile(activePath, 'utf8'));
      const today = todayWarsaw();
      const keep = (prevActive.listings || []).filter((l) => !l.auction_date || l.auction_date >= today);
      if (keep.length !== (prevActive.listings || []).length) {
        await writeFile(activePath, JSON.stringify({ ...prevActive, listings: keep }, null, 2) + '\n');
      }
    } catch { /* no previous active.json — nothing to age */ }
    const meta = {
      ...(prevMeta || { schema_version: SCHEMA_VERSION, parser_version: PARSER_VERSION }),
      city: city.id,
      generated_at: new Date().toISOString(),
      unique_properties: prevProperties.length,
      active_auctions: activeAuctions,
      archived_auctions: archivedAuctions,
      stale: true,
    };
    await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');
    console.error('--- summary (preserved + aged) ---');
    console.error(JSON.stringify(meta, null, 2));
    return meta;
  }

  // Accumulate against the previously-committed file so upstream deletions
  // don't erase history. active.json stays a live snapshot (current crawl only).
  let retained = { kept_properties: 0, kept_listings: 0 };
  if (MERGE_HISTORY && prevProperties.length > 0) {
    try {
      const merged = mergeProperties(prevProperties, properties);
      properties = merged.properties;
      retained = merged.stats;
      console.error(
        `History merge: ${properties.length} total (retained ${retained.kept_properties} properties + ${retained.kept_listings} listings absent from this crawl).`,
      );
    } catch (err) {
      console.error(`  WARN: history merge skipped (${err.message}); writing fresh build.`);
    }
    // Heal street case-variant ZOMBIES the merge resurrects: a genitive key
    // committed by an old run ("sportowej|6|2") is re-seeded forever even
    // after buildCityData coalesced the fresh copy into the nominative
    // ("sportowa|6|2") — duplicating the same auction in the archive. Fold
    // variants + dedupe per date on the POST-merge array.
    const beforeHeal = properties.length;
    properties = healStreetVariants(properties);
    if (properties.length !== beforeHeal) {
      console.error(`  healed ${beforeHeal - properties.length} street-variant zombie propert${beforeHeal - properties.length === 1 ? 'y' : 'ies'} post-merge.`);
    }
  }

  // Age out retained listings: a listing the source removed while still
  // 'active' is frozen by the merge and would inflate active_auctions forever.
  // (buildCityData reclassifies only the freshly-crawled listings.)
  const agedOut = archivePastActive(properties, todayWarsaw());
  if (agedOut) console.error(`  aged out ${agedOut} past-dated retained listings (active → archived).`);

  // Back-fill the history-derived round onto the live `active` listings (which
  // are written to active.json and power the site's "AKTUALNE AUKCJE" table).
  // build-properties derived the round from each property's attempt history, but
  // active.json carries the raw crawl listings — so copy the round across by
  // property key. This is what makes Gliwice's current listing show "II przetarg"
  // when it had one prior attempt, instead of a blank round.
  const activeRoundByKey = new Map();
  for (const p of properties) {
    const a = p.listings.find((l) => l.outcome === 'active' && l.round != null);
    if (a) activeRoundByKey.set(p.key, a.round);
  }
  for (const a of active) {
    if (a.round == null && a.address && activeRoundByKey.has(a.address.key)) {
      a.round = activeRoundByKey.get(a.address.key);
    }
  }

  // Count auctions by real status (from each listing's outcome), so the site can
  // show RUNNING auctions separately from concluded/archived ones. `active.length`
  // above is just the raw crawl size and over-counts "current" (it includes
  // past-dated announcements that build-properties reclassifies as `archived`).
  let activeAuctions = 0;
  let archivedAuctions = 0;
  for (const p of properties) {
    for (const l of p.listings) {
      if (l.outcome === 'active') activeAuctions++;
      else if (l.outcome === 'archived' || l.outcome === 'sold' || l.outcome === 'unsold' || l.outcome === 'no_winner') archivedAuctions++;
      // 'announced' (wykaz pre-announcements) counts as neither — it's an intent.
    }
  }

  const landBuilt = buildLand(landRecords, city.id, city);

  // PRESERVE-ON-EMPTY for LAND. Land has a single source per city (e.g. Bytom's
  // i-BIIP catalog), so a silent fetch failure there yields 0 plots and would
  // otherwise overwrite good land.json with an empty file. If we got 0 plots but
  // previously published some, treat it as a source outage and keep the last-good
  // file — same philosophy as the properties preserve-on-empty net above.
  const landFile = join(DATA_DIR, city.id, 'land.json');
  let landPlots = landBuilt.plots;
  let landPreserved = false;
  if (landPlots.length === 0 && existsSync(landFile)) {
    let prevPlots = [];
    try { prevPlots = JSON.parse(await readFile(landFile, 'utf8'))?.plots || []; } catch { prevPlots = []; }
    if (prevPlots.length > 0) {
      console.error(`  ${city.id}: land crawl returned 0 plots but ${prevPlots.length} were previously published — preserving land.json (likely a land-source outage).`);
      landPlots = prevPlots;
      landPreserved = true;
    }
  }

  const meta = {
    schema_version: SCHEMA_VERSION,
    parser_version: PARSER_VERSION,
    city: city.id,
    generated_at: new Date().toISOString(),
    source_pdf_count: docRefs.length,
    parsed_records: allRecords.length,
    parser_note_count: parsedNoteCount,
    unique_properties: properties.length,
    active_listings: active.length,        // raw crawl size (kept for back-compat)
    active_auctions: activeAuctions,       // genuinely running (outcome 'active')
    archived_auctions: archivedAuctions,   // concluded (archived/sold/unsold)
    wykaz_entries: wykaz.length,
    land_plots: landPlots.length,          // unique parcels in land.json (preserved on empty-crawl outage)
    land_listings: landRecords.length,     // raw land auction rows seen this run
    retained_properties: retained.kept_properties,
  };

  const cityDir = join(DATA_DIR, city.id);
  await mkdir(cityDir, { recursive: true });
  await writeFile(
    join(cityDir, 'properties.json'),
    JSON.stringify({ schema_version: SCHEMA_VERSION, city: city.id, properties }, null, 2) + '\n',
  );
  await writeFile(
    join(cityDir, 'active.json'),
    JSON.stringify({ schema_version: SCHEMA_VERSION, city: city.id, listings: active, wykaz }, null, 2) + '\n',
  );
  await writeFile(
    join(cityDir, 'meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );
  // Separate parcel-keyed store for land (działki/grunty). Flats, houses
  // (zabudowana) and commercial stay in properties.json/active.json; only land
  // lives here. See core/build-land.js.
  // Skip when preserving (above) so the last-good land.json is left untouched.
  if (!landPreserved) {
    await writeFile(
      join(cityDir, 'land.json'),
      JSON.stringify({ schema_version: LAND_SCHEMA_VERSION, city: city.id, plots: landBuilt.plots }, null, 2) + '\n',
    );
  }

  console.error('--- summary ---');
  console.error(JSON.stringify(meta, null, 2));
  const activeWithHistory = properties.filter(
    (p) =>
      p.listings.some((l) => l.outcome === 'active') &&
      p.listings.some((l) => l.outcome === 'unsold' || l.outcome === 'sold'),
  );
  console.error(`Currently active properties with prior history: ${activeWithHistory.length}`);
  return meta;
}

// City filter for the CI matrix: `CITY=bytom npm run refresh` runs only that
// city (comma-separated ids allowed) and SKIPS writing data/index.json —
// parallel matrix jobs would otherwise race on that one shared file. The
// aggregate CI job rebuilds the index afterwards via `node src/build-index.js`
// (see .github/workflows/refresh.yml). No CITY → full run, index written,
// exactly as before.
const CITY_FILTER = (process.env.CITY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  let selected = cities;
  if (CITY_FILTER.length) {
    const unknown = CITY_FILTER.filter((id) => !cities.some((c) => c.id === id));
    if (unknown.length) {
      throw new Error(
        `unknown city id(s) in CITY env: ${unknown.join(', ')} ` +
        `(registry: ${cities.map((c) => c.id).join(', ')})`,
      );
    }
    selected = cities.filter((c) => CITY_FILTER.includes(c.id));
    console.error(`CITY filter: running only [${CITY_FILTER.join(', ')}]; index.json skipped.`);
  }

  const metas = [];
  for (const city of selected) {
    // Per-city isolation: one city's crawl crashing (uncaught network/5xx error,
    // parser throw, …) must never fail the whole pipeline or drop the city from
    // the site. On failure we log it and reuse the city's last-published meta so
    // it keeps showing its previously-committed listings; its data files on disk
    // are left untouched.
    try {
      metas.push(await refreshCity(city));
    } catch (err) {
      console.error(`\n!!! ${city.id}: refresh FAILED (${err?.message || err}) — keeping last-published data, continuing with other cities.`);
      try {
        const prevMeta = JSON.parse(await readFile(join(DATA_DIR, city.id, 'meta.json'), 'utf8'));
        metas.push({ ...prevMeta, city: city.id, stale: true });
      } catch {
        console.error(`    (no previously-published data for ${city.id}; it will be absent this run)`);
      }
    }
  }

  if (CITY_FILTER.length) {
    console.error('\n=== selected cities done (index.json left to build-index.js) ===');
  } else {
    // Top-level discovery file: which cities exist + their headline counts.
    const index = {
      schema_version: SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      cities: cities.map((c) => {
        const m = metas.find((x) => x.city === c.id);
        return {
          id: c.id,
          label: c.label,
          authority: c.authority,
          host: c.host,
          unique_properties: m?.unique_properties ?? 0,
          active_listings: m?.active_listings ?? 0,
          active_auctions: m?.active_auctions ?? 0,
          archived_auctions: m?.archived_auctions ?? 0,
          wykaz_entries: m?.wykaz_entries ?? 0,
          land_plots: m?.land_plots ?? 0,
        };
      }),
    };
    await writeFile(
      join(DATA_DIR, 'index.json'),
      JSON.stringify(index, null, 2) + '\n',
    );

    console.error('\n=== all cities done ===');
    console.error(JSON.stringify(index, null, 2));
  }

  // Shut the headless browser if any city used it, so the process can exit.
  // No-op when render.js was never invoked (the common case).
  await closeBrowser();
}

main().catch(async (err) => {
  // Only truly catastrophic, non-city errors reach here (e.g. cannot write
  // DATA_DIR). Per-city crawl failures are isolated inside main()'s loop and
  // never bubble up to fail the whole pipeline.
  console.error('FATAL:', err);
  await closeBrowser().catch(() => {});
  process.exit(1);
});
