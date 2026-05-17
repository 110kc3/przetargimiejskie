// Top-level orchestrator. Builds the three JSON files the Chrome extension reads:
//
//   data/properties.json   one entry per unique (street, building, apt) with full history
//   data/active.json       current active listings + wykaz announcements
//   data/meta.json         provenance: when this ran, what PDFs went in, parser version
//
// Run with:  npm run refresh   (from pipeline/)

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { crawlAllResultPdfs } from './crawl-results.js';
import { ocrPdf } from './ocr-pdf.js';
import { parseResultPdf } from './parse-result.js';
import { crawlActive } from './crawl-active.js';

const SCHEMA_VERSION = 1;
const PARSER_VERSION = '0.1.0';
const DATA_DIR = new URL('../../data/', import.meta.url).pathname;

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  // ---- historical results
  console.error('Crawling /wyniki-przetargow/ ...');
  const pdfRefs = await crawlAllResultPdfs();
  console.error(`Found ${pdfRefs.length} result PDFs.\n`);

  console.error('OCR + parsing PDFs (cached entries are instant) ...');
  /** @type {import('./parse-result.js').ParsedAuctionRecord[]} */
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

  // ---- active + wykaz
  console.error('Crawling active listings + wykaz ...');
  const { listings: active, wykaz } = await crawlActive();
  console.error(`Got ${active.length} active listings, ${wykaz.length} wykaz entries.\n`);

  // ---- merge into properties
  /** @type {Map<string, any>} */
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
        kind, // first-seen kind; revised if we get a more specific signal later
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

  // Sort each property's listings chronologically (nulls last), then sort
  // properties by recency of latest listing.
  for (const p of props.values()) {
    p.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  }
  const properties = [...props.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return lb.localeCompare(la);
  });

  // ---- write outputs
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

  // Summary
  console.error('=== summary ===');
  console.error(JSON.stringify(meta, null, 2));
  const repeats = properties.filter(
    (p) => p.listings.filter((l) => l.outcome === 'unsold').length >= 1,
  );
  console.error(`Properties with >=1 unsold attempt: ${repeats.length}`);
  const activeWithHistory = properties.filter(
    (p) =>
      p.listings.some((l) => l.outcome === 'active') &&
      p.listings.some((l) => l.outcome === 'unsold' || l.outcome === 'sold'),
  );
  console.error(`Currently active properties with prior history: ${activeWithHistory.length}`);
  if (activeWithHistory.length > 0) {
    console.error('  Examples:');
    for (const p of activeWithHistory.slice(0, 10)) {
      const prior = p.listings.filter((l) => l.outcome !== 'active' && l.outcome !== 'announced');
      const currentL = p.listings.find((l) => l.outcome === 'active');
      const lastUnsold = [...prior].reverse().find((l) => l.outcome === 'unsold');
      const tag = lastUnsold
        ? `prev ${prior.length}× (last unsold ${lastUnsold.date} @ ${lastUnsold.starting_price_pln})`
        : `prev ${prior.length}× (last sold)`;
      console.error(`    ${p.street} ${p.building}${p.apt ? '/' + p.apt : ''}  current ${currentL.starting_price_pln} PLN — ${tag}`);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
