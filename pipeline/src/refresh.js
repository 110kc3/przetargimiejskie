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
import { buildCityData } from './core/build-properties.js';
import { mergeProperties } from './core/merge-history.js';

// History accumulation: merge each run with the previously-committed
// properties.json so a record the source later removes is retained (not lost).
// Set MERGE_HISTORY=0 to disable (fresh rebuild); also achieved per-city by
// deleting that city's data/<city>/properties.json before a run.
const MERGE_HISTORY = process.env.MERGE_HISTORY !== '0';

const SCHEMA_VERSION = 1;
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
  const { listings: active, wykaz } = await city.crawlActive();
  console.error(`Got ${active.length} active listings, ${wykaz.length} wykaz entries.\n`);

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

  // Accumulate against the previously-committed file so upstream deletions
  // don't erase history. active.json stays a live snapshot (current crawl only).
  const propPath = join(DATA_DIR, city.id, 'properties.json');
  let retained = { kept_properties: 0, kept_listings: 0 };
  if (MERGE_HISTORY && existsSync(propPath)) {
    try {
      const prev = JSON.parse(await readFile(propPath, 'utf8'))?.properties || [];
      const merged = mergeProperties(prev, properties);
      properties = merged.properties;
      retained = merged.stats;
      console.error(
        `History merge: ${properties.length} total (retained ${retained.kept_properties} properties + ${retained.kept_listings} listings absent from this crawl).`,
      );
    } catch (err) {
      console.error(`  WARN: history merge skipped (${err.message}); writing fresh build.`);
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
    active_listings: active.length,
    wykaz_entries: wykaz.length,
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

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const metas = [];
  for (const city of cities) {
    metas.push(await refreshCity(city));
  }

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
        wykaz_entries: m?.wykaz_entries ?? 0,
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

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
