
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import { parseAnnouncement, parseResultDoc } from './parse.js';

const ORIGIN = 'https://um.bip.legnica.eu';
const BOARD = `${ORIGIN}/uml/przetargi-na-nieruchomo/przetargi-na-lokale`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_PAGES = 20;


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(s) {
  const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}


export function parseBoardPage(html) {
  const rowRe =
    /<ul\s+class="[^"]*">\s*<li>.*?<\/li>\s*<li>\d+<\/li>\s*<li><a\s+href="(\/uml\/przetargi-na-nieruchomo\/przetargi-na-lokale\/(\d+),[^"]+\.html)">([^<]+)<\/a><\/li>\s*<li>([^<]*)<\/li>\s*<li>([^<]*)<\/li>\s*<li>([^<]*)<\/li>/gi;
  const out = [];
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const [, href, id, addressLabel, kindLabel, dateRaw, status] = m;
    out.push({
      id,
      detailUrl: `${ORIGIN}${href}`,
      addressLabel: stripTags(addressLabel),
      kindLabel: stripTags(kindLabel),
      dateRaw: dateRaw.trim(),
      status: status.trim(),
    });
  }
  return out;
}


export function attachmentUrlFromDetail(html) {
  const m = /href="(\/download\/[^"]+\.docx?)"/i.exec(html || '');
  if (!m) return null;
  return `${ORIGIN}${m[1]}`;
}


function fullAddressRaw(addressLabel, kindLabel) {
  const aptM = /\bnr\s+(\d+\s*[a-z]?)/i.exec(kindLabel || '');
  const apt = aptM ? aptM[1].replace(/\s+/, '') : null;

  let addr = addressLabel.replace(/[.\s]+$/, '').trim();

  if (apt) {
    return `${addr}/${apt}`;
  }
  return addr;
}


async function fetchBoardPage(page) {
  const url = page === 0 ? BOARD : `${BOARD}?page=${page}`;
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  legnica board page ${page} fetch failed: ${err.message}`);
    return null;
  }
}


export async function crawlActive() {
  const listings = [];
  const seenIds = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const html = await fetchBoardPage(page);
    if (!html) break;

    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    let added = 0;
    for (const row of rows) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);

      if (/wynik\s+przetargu/i.test(row.addressLabel)) continue;
      if (row.status === 'Rozstrzygniety' && !row.dateRaw) continue;

      const kind = classifyKind(row.kindLabel);
      if (kind === 'grunt') continue;
      if (kind === 'zabudowana') continue;
      if (kind === 'unknown') {
        if (!/lokal/i.test(row.kindLabel)) continue;
      }

      const addressRaw = fullAddressRaw(row.addressLabel, row.kindLabel);
      const address = parseAddress(addressRaw);
      if (!address) {
        console.error(`  legnica: could not parse address for row #${row.id}: ${addressRaw}`);
        continue;
      }

      listings.push({
        kind,
        address_raw: addressRaw,
        address,
        auction_date: parseDate(row.dateRaw),
        round: null,   // enriched from .docx attachment in enrichActive()
        area_m2: null, // enriched from .docx attachment in enrichActive()
        starting_price_pln: null, // enriched from detail HTML or .docx
        detail_url: row.detailUrl,
        doc_url: null, // resolved lazily in enrichActive()
      });
      added++;
    }
    console.error(`  legnica board page ${page}: ${rows.length} rows, ${added} new listings`);

    if (!/Nast[eę]pny/i.test(html)) break;
  }

  console.error(`  legnica crawlActive: ${listings.length} listings`);
  return { listings, wykaz: [], land: [] };
}


export async function enrichActive(active) {
  let recovered = 0;
  for (const l of active) {
    const hasData =
      l.starting_price_pln != null || l.area_m2 != null || l.round != null;
    if (hasData) continue;

    let docUrl = l.doc_url;
    if (!docUrl) {
      try {
        const html = await getText(l.detail_url, { userAgent: BROWSER_UA });
        docUrl = attachmentUrlFromDetail(html);
        if (docUrl) l.doc_url = docUrl;
      } catch (err) {
        console.error(`  legnica enrich: detail fetch failed (${l.address_raw}): ${err.message}`);
      }
    }
    if (!docUrl) continue;

    try {
      const text = await docText(docUrl, { userAgent: BROWSER_UA });
      const f = parseAnnouncement(text);
      if (l.area_m2 == null) l.area_m2 = f.area_m2;
      if (l.starting_price_pln == null) l.starting_price_pln = f.starting_price_pln;
      if (l.round == null) l.round = f.round;
      if (l.auction_date == null) l.auction_date = f.auction_date;
      if (f.area_m2 != null || f.starting_price_pln != null || f.round != null) recovered++;
    } catch (err) {
      console.error(`  legnica enrich: .doc parse failed (${l.address_raw}): ${err.message}`);
    }
  }
  console.error(`  legnica enrichActive: recovered ${recovered} from attachments`);
}


export async function crawlResultDocs() {
  const refs = [];
  const seenIds = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const html = await fetchBoardPage(page);
    if (!html) break;

    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    for (const row of rows) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);

      if (row.status !== 'Rozstrzygniety') continue;
      if (!/wynik\s+przetargu/i.test(row.addressLabel)) continue;

      let docUrl = null;
      try {
        const detailHtml = await getText(row.detailUrl, { userAgent: BROWSER_UA });
        docUrl = attachmentUrlFromDetail(detailHtml);
      } catch (err) {
        console.error(`  legnica result detail fetch failed ${row.detailUrl}: ${err.message}`);
        continue;
      }
      if (!docUrl) {
        console.error(`  legnica: no .doc attachment on result notice ${row.detailUrl}`);
        continue;
      }

      refs.push({
        doc_url: docUrl,
        auction_date: parseDate(row.dateRaw) || null,
        detail_url: row.detailUrl,
      });
    }

    if (!/Nast[eę]pny/i.test(html)) break;
  }

  console.error(`  legnica crawlResultDocs: ${refs.length} result notice(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
