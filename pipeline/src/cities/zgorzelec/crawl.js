// Zgorzelec crawler — server-rendered bip.info.pl BIP, consumed as plain HTML
// (no SPA, no OCR, no TLS workaround). See config.js.
//
// Two dedicated boards under "Przetargi":
//   ANNOUNCEMENTS  index.php?idmp=32&r=r → crawlActive (listings + land)
//   RESULTS        index.php?idmp=34&r=r → crawlResultDocs (achieved price)
// Each board is a table; every property row links to a document
//   dokument.php?iddok={id}&idmp={NN}&r=r
// whose <div id="content-main"> carries the full notice as flowing HTML text.
// We extract the board link text (TITLE) + the document body (BODY) and build
// the parse blob via buildRecordText(). Announcements are routed by kind:
//   grunt → land ;  flat / commercial unit → listings.
// Call-for-tenders / works contracts ("Zaproszenie do składania ofert …") and
// leases ("dzierżawa"/"najem") share the announcement board and are skipped.
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://zgorzelec.bip.info.pl';
const IDMP_ANNOUNCE = 32;
const IDMP_RESULT = 34;

// A browser UA — bip.info.pl serves the bot UA too, but a browser UA is the safe
// default for municipal WAFs (harmless if unneeded).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Hard cap so a broken/looping board can never spin forever. Both boards are a
// single page at current (low) volume; the loop also stops as soon as a page
// yields no NEW iddok (so unknown pagination params can't over-fetch).
const MAX_PAGES = 12;

const boardUrl = (idmp, page) =>
  `${ORIGIN}/index.php?idmp=${idmp}&r=r${page > 1 ? `&strona=${page}` : ''}`;
const docUrl = (iddok, idmp) => `${ORIGIN}/dokument.php?iddok=${iddok}&idmp=${idmp}&r=r`;

/** Isolate the <div id="content-main"> region of a page (board list or document
 *  body), dropping the surrounding chrome + the right column / footer. */
function contentMain(html) {
  if (!html) return '';
  const i = html.indexOf('id="content-main"');
  if (i < 0) return html;
  let j = html.indexOf('id="colRight"');
  if (j < 0 || j < i) j = html.indexOf('id="footer"');
  return j > i ? html.slice(i, j) : html.slice(i);
}

/** Decode the handful of entities that appear inside hrefs. */
function decodeHref(h) {
  return h.replace(/&amp;/gi, '&');
}

/**
 * Article refs from one board page's HTML. Each property row links to
 * dokument.php?iddok={id}&idmp={idmp}&r=r; the anchor text is the notice title
 * and the (optional) `title=` attribute carries the validity/deadline date.
 * @param {string} html
 * @param {number} idmp
 * @returns {Array<{iddok:string, url:string, title:string, deadline:string|null}>}
 */
export function parseBoardPage(html, idmp) {
  const region = contentMain(html);
  const out = [];
  const seen = new Set();
  const re = new RegExp(
    `<a\\b([^>]*?)href='dokument\\.php\\?iddok=(\\d+)&amp;idmp=${idmp}[^']*'([^>]*)>([\\s\\S]*?)</a>`,
    'gi',
  );
  let m;
  while ((m = re.exec(region)) !== null) {
    const iddok = m[2];
    if (seen.has(iddok)) continue;
    seen.add(iddok);
    const attrs = `${m[1]} ${m[3]}`;
    const title = m[4].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const dm = /title='[^']*upływa\s+w\s+dniu\s+(\d{2}\.\d{2}\.\d{4})/i.exec(attrs);
    const deadline = dm ? `${dm[1].slice(6)}-${dm[1].slice(3, 5)}-${dm[1].slice(0, 2)}` : null;
    out.push({ iddok, url: decodeHref(docUrl(iddok, idmp)), title, deadline });
  }
  return out;
}

/** All article refs on a board, walking bounded pages until no NEW iddok. */
async function fetchBoardRefs(idmp) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(boardUrl(idmp, page), { userAgent: UA });
    } catch (err) {
      console.error(`  zgorzelec: board idmp=${idmp} page ${page} failed: ${err.message}`);
      break;
    }
    const pageRefs = parseBoardPage(html, idmp);
    let added = 0;
    for (const r of pageRefs) {
      if (seen.has(r.iddok)) continue;
      seen.add(r.iddok);
      refs.push(r);
      added++;
    }
    if (added === 0) break; // single-page board, or past the last page
  }
  return refs;
}

/** Extract the notice BODY (plain text) from a document page's content-main:
 *  trim the metadata header ("… wersja do wydruku") and the footer ("Powrót" /
 *  "Metryka dokumentu"), which carry publish-date decoys. */
export function extractDocBody(html) {
  let txt = contentMain(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const head = txt.indexOf('wersja do wydruku');
  if (head >= 0) txt = txt.slice(head + 'wersja do wydruku'.length).trim();
  const cutAt = ['Powrót', 'Metryka dokumentu', 'Załączniki']
    .map((s) => txt.indexOf(s))
    .filter((n) => n >= 0);
  if (cutAt.length) txt = txt.slice(0, Math.min(...cutAt)).trim();
  return txt;
}

/** Fetch one document → { text, title, url }, or null. */
async function fetchDoc(ref) {
  let html;
  try {
    html = await getText(ref.url, { userAgent: UA });
  } catch (err) {
    console.error(`  zgorzelec: doc ${ref.iddok} fetch failed: ${err.message}`);
    return null;
  }
  const body = extractDocBody(html);
  const text = buildRecordText({ title: ref.title, body });
  return { text, title: ref.title, url: ref.url, deadline: ref.deadline };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats + commercial units)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, source_url, auction_date }

  // ---- announcements board (idmp=32) ----
  const announceRefs = await fetchBoardRefs(IDMP_ANNOUNCE);
  for (const ref of announceRefs) {
    const rec = await fetchDoc(ref);
    if (!rec) continue;
    const { text } = rec;
    if (!isSaleAuction(text)) continue; // Zaproszenie do składania ofert / works
    if (isLease(text)) continue;        // dzierżawa / najem

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;
    if (!parsed.auction_date && ref.deadline) parsed.auction_date = ref.deadline;

    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  // ---- results board (idmp=34) ----
  const resultBoardRefs = await fetchBoardRefs(IDMP_RESULT);
  for (const ref of resultBoardRefs) {
    const rec = await fetchDoc(ref);
    if (!rec) continue;
    const { text } = rec;
    resultRefs.push({
      text,
      source_url: ref.url,
      auction_date: auctionDateFromText(text) || ref.deadline || null,
    });
  }

  console.error(
    `  zgorzelec: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
