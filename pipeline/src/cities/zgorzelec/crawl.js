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
  parseAnnouncements,
  parseResultDoc,
  stripHtml,
  isSaleAuction,
  isLease,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://zgorzelec.bip.info.pl';
const IDMP_ANNOUNCE = 32;
const IDMP_RESULT = 34;
const ANNOUNCEMENT_ARCHIVE = `${ORIGIN}/dokument.php?iddok=10598&idmp=394&r=r`;
const RESULT_ARCHIVE = `${ORIGIN}/dokument.php?iddok=11762&idmp=402&r=r`;

// A browser UA — bip.info.pl serves the bot UA too, but a browser UA is the safe
// default for municipal WAFs (harmless if unneeded).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Bound actual pagination, explicitly linked year archives and each document
// stream. Missing/looping pages and the result category placeholder stay partial.
const MAX_PAGES = 12;
const MAX_YEAR_BOARDS = 8;
const MAX_DOCUMENTS = 120;

const boardUrl = idmp => `${ORIGIN}/index.php?idmp=${idmp}&r=r`;
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

function links(html) {
  return [...String(html || '').matchAll(/<a\b([^>]*?)href=(['"])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(m => ({ href: decodeHref(m[3]), attrs: `${m[1]} ${m[4]}`, title: stripHtml(m[5]) }));
}

function sourceUrl(href) {
  try {
    const url = new URL(href, `${ORIGIN}/`);
    return url.origin === ORIGIN ? url : null;
  } catch { return null; }
}

/** Only explicitly linked year boards; admin links become public board probes. */
export function parseYearBoards(html, year = new Date().getFullYear()) {
  const seen = new Set();
  return links(contentMain(html)).flatMap(link => {
    if (!/^\d{4}$/.test(link.title) || +link.title < 2020 || +link.title > year) return [];
    const url = sourceUrl(link.href);
    const idmp = url?.searchParams.get('idmp');
    if (!url || !/^\d+$/.test(idmp || '') || !['/index.php', '/admin/mp.php'].includes(url.pathname) || seen.has(idmp)) return [];
    seen.add(idmp);
    return [{ year: +link.title, idmp: +idmp, publicProbe: url.pathname === '/admin/mp.php' }];
  }).sort((a, b) => b.year - a.year);
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
  for (const link of links(region)) {
    const url = sourceUrl(link.href);
    if (!url) continue;
    const comma = /^\/dokument,iddok,(\d+),idmp,(\d+),r,r\/?$/.exec(url.pathname);
    if (comma ? comma[2] !== String(idmp) : url.pathname !== '/dokument.php' || url.searchParams.get('idmp') !== String(idmp)) continue;
    const iddok = comma ? comma[1] : url.searchParams.get('iddok');
    if (!/^\d+$/.test(iddok || '')) continue;
    if (seen.has(iddok)) continue;
    seen.add(iddok);
    const dm = /title=['"][^'"]*upływa\s+w\s+dniu\s+(\d{2}\.\d{2}\.\d{4})/i.exec(link.attrs);
    const deadline = dm ? `${dm[1].slice(6)}-${dm[1].slice(3, 5)}-${dm[1].slice(0, 2)}` : null;
    out.push({ iddok, url: docUrl(iddok, idmp), title: link.title, deadline });
  }
  return out;
}

/** All article refs on a board, following only its own published page links. */
export async function fetchBoardRefs(idmp, { fetchText = getText, maxPages = MAX_PAGES } = {}) {
  const refs = [];
  refs.complete = false;
  const seen = new Set();
  let url = boardUrl(idmp);
  for (let page = 1; page <= maxPages; page++) {
    let html;
    try {
      html = await fetchText(url, { userAgent: UA });
    } catch (err) {
      console.error(`  zgorzelec: board idmp=${idmp} page ${page} failed: ${err.message}`);
      break;
    }
    const region = contentMain(html);
    const input = name => {
      for (const m of region.matchAll(/<input\b[^>]*>/gi)) {
        const attr = key => new RegExp(`\\b${key}\\s*=\\s*['"]?([^\\s'">]+)`, 'i').exec(m[0])?.[1];
        if (attr('name') === name) return attr('value');
      }
      return null;
    };
    if (!html.includes('id="content-main"') || input('idmp') !== String(idmp) || input('istr') !== String(page)) break;
    if (/wybierz\s+podkatalog/i.test(stripHtml(region))) break;
    const pageRefs = parseBoardPage(html, idmp);
    if (!pageRefs.length && !/brak\s+dokument[óo]w/i.test(stripHtml(region))) break;
    const documentLinks = links(region).filter(link => /dokument(?:\.php\?iddok=|,iddok,)/i.test(link.href));
    const recognizedLinks = documentLinks.every(link => {
      const url = sourceUrl(link.href);
      return url && (url.pathname === '/dokument.php'
        ? url.searchParams.get('idmp') === String(idmp) && /^\d+$/.test(url.searchParams.get('iddok') || '')
        : new RegExp(`^/dokument,iddok,\\d+,idmp,${idmp},r,r/?$`).test(url.pathname));
    });
    let added = 0;
    for (const r of pageRefs) {
      if (seen.has(r.iddok)) continue;
      seen.add(r.iddok);
      refs.push(r);
      added++;
    }
    if (!recognizedLinks) break;
    const pages = links(region).map(link => sourceUrl(link.href)).filter(next => next
      && next.pathname === '/index.php' && next.searchParams.get('idmp') === String(idmp))
      .map(next => ({ url: next.href, page: Number(next.searchParams.get('istr') || next.searchParams.get('strona') || 1) }))
      .filter(next => next.page > page);
    if (!pages.length) { refs.complete = true; break; }
    const next = pages.find(next => next.page === page + 1);
    if (!next || !added || page === maxPages) break;
    url = next.url;
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
async function fetchDoc(ref, fetchText = getText) {
  let html;
  try {
    html = await fetchText(ref.url, { userAgent: UA });
  } catch (err) {
    console.error(`  zgorzelec: doc ${ref.iddok} fetch failed: ${err.message}`);
    return null;
  }
  const region = contentMain(html);
  if (!html.includes('id="content-main"') || !links(region).some(link => {
    const url = sourceUrl(link.href);
    return url?.pathname === '/dokument_druk.php' && url.searchParams.get('iddok') === ref.iddok;
  })) return null;
  const body = extractDocBody(html);
  const text = buildRecordText({ title: ref.title, body });
  return { text, title: ref.title, url: ref.url, deadline: ref.deadline };
}

let crawlPromise = null;

export async function crawlAll({ fetchText = getText, year = new Date().getFullYear(), maxDocuments = MAX_DOCUMENTS } = {}) {
  const listings = []; // address-keyed active records (flats + commercial units)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, source_url, auction_date }

  // ---- announcements board (idmp=32) ----
  async function discover(root, archive) {
    const refs = await fetchBoardRefs(root, { fetchText });
    const seen = new Set(refs.map(ref => ref.iddok));
    let boards;
    try { boards = parseYearBoards(await fetchText(archive, { userAgent: UA }), year); }
    catch (err) {
      console.error(`  zgorzelec: archive index failed (${archive}): ${err.message}`);
      refs.complete = false; boards = [];
    }
    if (!boards.length || boards.length > MAX_YEAR_BOARDS) refs.complete = false;
    for (const board of boards.slice(0, MAX_YEAR_BOARDS)) {
      const historical = await fetchBoardRefs(board.idmp, { fetchText });
      if (!historical.complete || board.publicProbe) refs.complete = false;
      for (const ref of historical) if (!seen.has(ref.iddok)) { seen.add(ref.iddok); refs.push(ref); }
    }
    if (refs.length > maxDocuments) refs.complete = false;
    const bounded = refs.slice(0, maxDocuments);
    bounded.complete = refs.complete;
    return bounded;
  }
  const announceRefs = await discover(IDMP_ANNOUNCE, ANNOUNCEMENT_ARCHIVE);
  for (const ref of announceRefs) {
    const rec = await fetchDoc(ref, fetchText);
    if (!rec) { announceRefs.complete = false; continue; }
    const { text } = rec;
    if (!isSaleAuction(text)) continue; // Zaproszenie do składania ofert / works
    if (isLease(text)) continue;        // dzierżawa / najem

    const parsedRecords = parseAnnouncements(text);
    if (!parsedRecords.length || parsedRecords.some(record => !record.auction_date)) announceRefs.complete = false;
    for (const parsed of parsedRecords) {
      const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
      (parsed.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  // ---- results board (idmp=34) ----
  const resultBoardRefs = await discover(IDMP_RESULT, RESULT_ARCHIVE);
  resultRefs.complete = resultBoardRefs.complete === true;
  for (const ref of resultBoardRefs) {
    const rec = await fetchDoc(ref, fetchText);
    if (!rec) { resultRefs.complete = false; continue; }
    const { text } = rec;
    const parsed = parseResultDoc(text, null, ref.url);
    if (isLease(text) || !parsed.length) { resultRefs.complete = false; continue; }
    if (parsed.some(record => !record.auction_date)) resultRefs.complete = false;
    resultRefs.push({
      text,
      pdf_url: ref.url, source_url: ref.url,
      auction_date: auctionDateFromText(text),
    });
  }

  console.error(
    `  zgorzelec: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s); announcement window complete=${announceRefs.complete}`,
  );
  return { listings, land, resultRefs, land_complete: false };
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
  return { listings, wykaz: [], land, land_complete: false };
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
