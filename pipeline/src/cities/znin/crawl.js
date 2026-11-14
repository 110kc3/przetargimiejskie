import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseNotice, parseResultDoc, extractAuctionDate, isRental, toAscii } from './parse.js';

const HOST = 'https://bip.gminaznin.pl';
const BOARD_URL = `${HOST}/nieruchomosci`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_NOTICES = 90;


export function parseBoard(html) {
  const seen = new Set();
  const out = [];
  for (const m of (html || '').matchAll(/href="(\/nieruchomosc\/[a-z0-9][a-z0-9-]*)"/gi)) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(HOST + path);
  }
  return out;
}

function hasRealText(t) {
  return Boolean(t) && t.replace(/[\s\f]+/g, '').length >= 20;
}

async function auctionDateFromPdf(pdfUrl) {
  if (!pdfUrl) return null;
  let text = '';
  try {
    text = await pdfText(pdfUrl, FETCH_OPTS);
  } catch (err) {
    console.error(`  znin: pdfText failed (${pdfUrl}): ${err.message}`);
  }
  if (!hasRealText(text)) {
    try {
      text = await ocrPdf(pdfUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  znin: OCR failed (${pdfUrl}): ${err.message}`);
      return null;
    }
  }
  return extractAuctionDate(text);
}


let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;

  let boardHtml;
  try {
    boardHtml = await getText(BOARD_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  znin: board fetch failed (${BOARD_URL}): ${err.message}`);
    _cache = [];
    return _cache;
  }

  const urls = parseBoard(boardHtml).slice(0, MAX_NOTICES);
  console.error(`  znin: ${urls.length} notice link(s) on the board`);

  const records = [];
  for (const url of urls) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  znin: notice fetch failed (${url}): ${err.message}`);
      continue;
    }
    const n = parseNotice(html, url);
    if (n.cancelled) { console.error(`  znin: cancelled, skip: ${url}`); continue; }
    if (isRental(n.title)) { console.error(`  znin: rental, skip: ${url}`); continue; }

    const emittable = n.kind === 'grunt' ? Boolean(n.dzialka_nr) : Boolean(n.address);
    if (!emittable) { console.error(`  znin: unkeyable (kind=${n.kind}), skip: ${url}`); continue; }

    const auction_date = await auctionDateFromPdf(n.pdf_url);
    records.push({ ...n, html, auction_date });
  }

  console.error(`  znin: ${records.length} emittable record(s) parsed from ${urls.length} notice(s)`);
  _cache = records;
  return records;
}

function subjectKey(r) {
  if (r.kind === 'grunt') {
    return r.dzialka_nr ? `dz|${toAscii(r.obreb || '')}|${r.dzialka_nr}` : null;
  }
  return r.address ? r.address.key : null;
}


export async function crawlActive() {
  const records = await discoverAll();
  const listings = records.map((r) => ({
    kind: r.kind,
    address: r.address,
    address_raw: r.address_raw,
    dzialka_nr: r.dzialka_nr,
    obreb: r.obreb,
    area_m2: r.area_m2,
    starting_price_pln: r.starting_price_pln,
    auction_date: r.auction_date,
    round: r.round,
    detail_url: r.detail_url,
    published_date: r.published_date,
  }));
  console.error(`  znin active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const records = await discoverAll();

  const groups = new Map();
  for (const r of records) {
    if (r.round == null) continue;
    const key = subjectKey(r);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const refs = [];
  for (const group of groups.values()) {
    const byRound = new Map();
    for (const r of group) if (!byRound.has(r.round)) byRound.set(r.round, r);
    const rounds = [...byRound.keys()].sort((a, b) => a - b);
    for (let i = 0; i < rounds.length - 1; i++) {
      const r = byRound.get(rounds[i]);
      refs.push({ text: r.html, pdf_url: r.detail_url, auction_date: r.auction_date });
    }
  }
  console.error(`  znin crawlResultDocs: ${refs.length} superseded round(s) across ${groups.size} subject(s)`);
  return refs;
}

export { parseResultDoc };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'board') {
    const html = await getText(BOARD_URL, FETCH_OPTS);
    const urls = parseBoard(html);
    process.stdout.write(urls.join('\n') + `\n(${urls.length} notice links)\n`);
  } else if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(
      JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n',
    );
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total active: ${listings.length}`);
  }
}
