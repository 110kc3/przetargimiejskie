// Top-level orchestrator. Builds the three JSON files the Chrome extension reads:
//
//   data/properties.json   one entry per unique (street, building, apt) with full history
//   data/active.json       current active listings + wykaz announcements
//   data/meta.json         provenance: when this ran, what PDFs went in, parser version
//
// Run with:  npm run refresh   (from pipeline/)

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { crawlAllResultPdfs } from './crawl-results.js';
import { ocrPdf } from './ocr-pdf.js';
import { parseResultPdf } from './parse-result.js';
import { crawlActive } from './crawl-active.js';
import { crawlDetailAreas } from './crawl-detail-areas.js';
import { getText } from './lib/fetch.js';
import { urlCacheKey } from './lib/hash.js';

const SCHEMA_VERSION = 1;
const PARSER_VERSION = '0.2.0';
const DATA_DIR = new URL('../../data/', import.meta.url).pathname;
const DETAIL_CACHE_DIR = new URL('../detail-cache/', import.meta.url).pathname;

const WADIUM_RE =
  /wniesienie\s+do\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*wadium/i;
const VIEWING_RE =
  /(?:Termin\s+udost[ęe]pnienia|udost[ęe]pnienia\s+lokalu)[^.]*?(\d{1,2})\.(\d{1,2})\.(\d{4})/i;

async function augmentActiveWithWadium(active) {
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

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  console.error('Crawling /wyniki-przetargow/ ...');
  const pdfRefs = await crawlAllResultPdfs();
  console.error(`Found ${pdfRefs.length} result PDFs.\n`);

  console.error('OCR + parsing PDFs (cached entries are instant) ...');
  const allRecords = [];
  let parsedNoteCount = 0;
  for (const ref of pdfRefs) {
    let text;
    try {
      text = await ocrPdf(ref.pdf_url);
    } catch (err) {
      console.error(`  ERROR OCR ${ref.pdf_url}: ${err.message}`);
      continue;
    }
    const recs = parseResultPdf(text, ref.auction_date, ref.pdf_url);
    if (recs.length === 0) {
      console.error(`  WARN ${ref.auction_date}: parser returned 0 records from ${ref.pdf_url}`);
    }
    for (const r of recs) parsedNoteCount += r.notes.length;
    allRecords.push(...recs);
  }
  console.error(`Parsed ${allRecords.length} auction records (${parsedNoteCount} parser notes).\n`);

  console.error('Crawling active listings + wykaz ...');
  const { listings: active, wykaz } = await crawlActive();
  console.error(`Got ${active.length} active listings, ${wykaz.length} wykaz entries.\n`);

  // Look up the wadium deadline for each active listing (re-fetches at most
  // ~15 detail pages once, then served from cache forever after).
  await augmentActiveWithWadium(active);

  const props = new Map();
  function ensureProperty(addr, kind) {
    if (!addr) return null;
    const key = addr.key;
    let p = props.get(key);
    if (!p) {
      p = {
        key,
        street: addr.street,
        street_norm: addr.street_norm,
        building: addr.building,
        apt: addr.apt,
        kind,
        listings: [],
      };
      props.set(key, p);
    }
    return p;
  }

  for (const r of allRecords) {
    if (!r.address) continue;
    const p = ensureProperty(r.address, r.kind);
    if (!p) continue;
    p.listings.push({
      date: r.auction_date,
      round: r.round,
      kind: r.kind,
      starting_price_pln: r.starting_price_pln,
      outcome: r.outcome,
      unsold_reason: r.unsold_reason,
      final_price_pln: r.final_price_pln,
      source_pdf: r.source_pdf,
      notes: r.notes,
    });
  }
  for (const a of active) {
    if (!a.address) continue;
    const p = ensureProperty(a.address, a.kind);
    if (!p) continue;
    p.listings.push({
      date: a.auction_date,
      round: null,
      kind: a.kind,
      starting_price_pln: a.starting_price_pln,
      outcome: 'active',
      area_m2: a.area_m2,
      detail_url: a.detail_url,
      wadium_deadline: a.wadium_deadline || null,
      viewing_date: a.viewing_date || null,
    });
  }
  for (const w of wykaz) {
    if (!w.address) continue;
    const p = ensureProperty(w.address, 'unknown');
    if (!p) continue;
    p.listings.push({
      date: w.published_date,
      round: null,
      kind: p.kind,
      outcome: 'announced',
      wykaz_no: w.wykaz_no,
    });
  }

  // ---- enrich with area from detail pages
  let detailAreas = new Map();
  try {
    detailAreas = await crawlDetailAreas();
  } catch (err) {
    console.error('  WARN: detail-page enrichment failed:', err.message);
  }
  for (const [key, area] of detailAreas) {
    const p = props.get(key);
    if (!p) continue;
    if (p.area_m2 == null) p.area_m2 = area;
    for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = area;
  }
  // Fuzzy Polish-case retry on the street suffix.
  const variants = (street) => {
    const out = new Set([street]);
    const subs = [
      ['ej$', 'a'], ['iej$', 'a'], ['ego$', 'y'], ['ego$', ''],
      ['skiej$', 'ska'], ['skiego$', 'ski'], ['ckiej$', 'cka'], ['ckiego$', 'cki'],
    ];
    for (const [re, repl] of subs) {
      const v = street.replace(new RegExp(re), repl);
      if (v !== street) out.add(v);
    }
    return [...out];
  };
  let fuzzyHits = 0;
  for (const p of props.values()) {
    if (p.area_m2 != null) continue;
    for (const altStreet of variants(p.street_norm)) {
      const altKey = `${altStreet}|${p.building}|${p.apt ?? ''}`;
      if (altKey === p.key) continue;
      const area = detailAreas.get(altKey);
      if (area != null) {
        p.area_m2 = area;
        for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = area;
        fuzzyHits++;
        break;
      }
    }
  }
  if (fuzzyHits) console.error(`  fuzzy-key area matches: ${fuzzyHits}`);

  // Propagate area across all listings of the same property.
  for (const p of props.values()) {
    const known = p.listings.find((l) => l.area_m2 != null)?.area_m2;
    if (known == null) continue;
    p.area_m2 = known;
    for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = known;
  }

  for (const p of props.values()) {
    p.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  }
  const properties = [...props.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });

  const meta = {
    schema_version: SCHEMA_VERSION,
    parser_version: PARSER_VERSION,
    generated_at: new Date().toISOString(),
    source_pdf_count: pdfRefs.length,
    parsed_records: allRecords.length,
    parser_note_count: parsedNoteCount,
    unique_properties: properties.length,
    active_listings: active.length,
    wykaz_entries: wykaz.length,
  };

  await writeFile(
    join(DATA_DIR, 'properties.json'),
    JSON.stringify({ schema_version: SCHEMA_VERSION, properties }, null, 2) + '\n',
  );
  await writeFile(
    join(DATA_DIR, 'active.json'),
    JSON.stringify({ schema_version: SCHEMA_VERSION, listings: active, wykaz }, null, 2) + '\n',
  );
  await writeFile(
    join(DATA_DIR, 'meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );

  console.error('=== summary ===');
  console.error(JSON.stringify(meta, null, 2));
  const activeWithHistory = properties.filter(
    (p) =>
      p.listings.some((l) => l.outcome === 'active') &&
      p.listings.some((l) => l.outcome === 'unsold' || l.outcome === 'sold'),
  );
  console.error(`Currently active properties with prior history: ${activeWithHistory.length}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
