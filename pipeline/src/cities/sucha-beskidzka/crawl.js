import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { htmlToText } from '../../core/finn-bip.js';
import { isSaleTitle, parseAnnouncement, cleanText, subjectKey } from './parse.js';

const ORIGIN = 'https://sucha-beskidzka.pl';
const BOARD = '/pl/879/0/przetargi-na-nieruchomosci.html';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const NOTICE_RE = /<a[^>]+href="([^"]*\/mfiles\/879\/[^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
const MAX_NOTICES = Number(process.env.SUCHA_MAX_NOTICES) || 60;

function absPdf(href) {
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('http://')) return `https://${href.slice('http://'.length)}`;
  if (href.startsWith('https://')) return href;
  return `${ORIGIN}${href.startsWith('/') ? href : `/${href}`}`;
}

function harvestNotices(html) {
  const out = [];
  const seen = new Set();
  let m;
  while ((m = NOTICE_RE.exec(html)) !== null) {
    const url = absPdf(m[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: htmlToText(m[2]) });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  let html;
  try {
    html = await getText(`${ORIGIN}${BOARD}`, FETCH_OPTS);
  } catch (err) {
    console.error(`  sucha-beskidzka: board fetch failed: ${err.message}`);
    return { listings: [], land: [], records: [] };
  }

  const notices = harvestNotices(html).filter((n) => isSaleTitle(n.title)).slice(0, MAX_NOTICES);
  console.error(`  sucha-beskidzka: ${notices.length} sale notice(s) on the board`);

  const listings = [];
  const land = [];
  const records = [];
  for (const n of notices) {
    let raw;
    try {
      raw = await pdfText(n.url);
    } catch (err) {
      console.error(`  sucha-beskidzka PDF failed (${n.url}): ${err.message}`);
      continue;
    }
    const rec = parseAnnouncement(n.title, raw, n.url);
    if (!rec) {
      console.error(`  sucha-beskidzka WARN: unparsed sale notice ${n.url} (${(n.title || '').slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
    records.push({ ...rec, text: cleanText(raw), url: n.url });
  }

  console.error(`  sucha-beskidzka: ${listings.length} flat/built listing(s), ${land.length} land plot(s)`);
  return { listings, land, records };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const { records } = await crawlPromise;

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
      refs.push({ text: r.text, pdf_url: r.url, auction_date: r.auction_date });
    }
  }
  console.error(`  sucha-beskidzka crawlResultDocs: ${refs.length} confirmed-superseded round(s) across ${groups.size} subject(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n');
  } else {
    const { listings, wykaz, land } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings, wykaz, land }, null, 2) + '\n');
    console.error(`Total: ${listings.length} listing(s), ${land.length} land`);
  }
}
