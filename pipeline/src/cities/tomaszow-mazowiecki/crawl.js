// Tomaszów Mazowiecki crawler — bip.tomaszow.miasta.pl (custom PHP BIP,
// server-rendered, no JS). See config.js for the two-board shape.
//
// crawlActive():
//   Fetches the announcements board (?id=144386), each of whose rows is a
//   SUB-PAGE link (`?id=`, not a file). Each sub-page is fetched in turn and
//   lists several PDF attachments (mapa, regulamin, oświadczenia, AND the
//   real "Ogłoszenie o przetargu ...pdf") — pickAnnouncementFile() selects the
//   real announcement by filename. That file's text is extracted (pdfText or
//   docText) and handed to parse.js. Bounded by MAX_ANNOUNCEMENT_ITEMS (the
//   whole board is a single non-paginated page; the cap is a defensive CI
//   budget, not a real pagination limit — currently only 3 items live).
//
// crawlResultDocs():
//   Fetches the results board (?id=148898), whose ~200 rows link DIRECTLY to
//   a PDF/DOCX (no sub-page) — "Informacja [Prezydenta Miasta] o
//   wynikach/rozstrzygnięciu ... przetargu" — newest-first, one page, no
//   pagination. ALL already-known docs (loadKnownSourceUrls ∪
//   loadKnownLandUrls — properties.json AND land.json URLs) are re-emitted
//   from the content-addressed text cache (no network), because refresh.js
//   REBUILDS land.json from each crawl; only genuinely NEW docs count against
//   MAX_RESULT_ITEMS, so each refresh advances the backfill window ~15 docs
//   deeper into the archive at a capped host load. Raise the cap via
//   TOMASZOW_MAX_RESULT_ITEMS for a faster one-off backfill.
//
// The "Aktualne wykazy nieruchomości" board (?id=153642) is deliberately not
// crawled — see config.js header for the scope decision (stale/bezprzetargowa/
// aport mix, not the open-auction stream).
//
// Session-redirect defensive fallback (see config.js header): the spike
// (2026-06-27) reported cookie-less ?id= deep links redirecting to the
// homepage; this build's live re-verification (2026-07-19) found every board
// and item page loads its real content on a bare, cookie-less GET — the quirk
// did not reproduce over several repeated fetches (including fresh processes,
// no shared session). fetchPage() below keeps a defensive one-shot retry
// (establish a session against the homepage, harvest the JSESSIONID
// Set-Cookie, forward it via proxyFetch — the same cookie-jar idiom as
// brzeg/crawl.js's waiting-room retry, since politeGet cannot send a Cookie
// header) in case the redirect resurfaces for a different caller IP (e.g. the
// GH Actions runner). Detection: a homepage redirect serves the bare site
// title with NO page-specific " - Urząd..." suffix that every real content
// page carries.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { getText, politeGet, proxyFetch } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText, isAnnouncement, parseAnnouncement, parseResultDoc } from './parse.js';

const ORIGIN = 'http://bip.tomaszow.miasta.pl';
const BASE = `${ORIGIN}/public`;
const ANNOUNCEMENTS_BOARD = `${BASE}/?id=144386`;
const RESULTS_BOARD = `${BASE}/?id=148898`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_ANNOUNCEMENT_ITEMS = 20; // defensive cap; board is un-paginated, ~3 live today
const MAX_RESULT_ITEMS = Number(process.env.TOMASZOW_MAX_RESULT_ITEMS) || 15;
const CRAWL_BUDGET_MS = Number(process.env.TOMASZOW_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Session-redirect defensive fallback (see header)
// ---------------------------------------------------------------------------

const HOMEPAGE_TITLE_RE = /<title>\s*Urz[ąa]d\s+Miasta\s+w\s+Tomaszowie\s+Mazowieckim\s*<\/title>/i;

function looksLikeHomepageRedirect(html) {
  return HOMEPAGE_TITLE_RE.test(html || '');
}

function harvestCookies(res, jar) {
  const lines = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of lines) {
    const pair = line.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

let sessionJarPromise = null;

// Establish (once per process) a session cookie against the homepage, for the
// defensive retry only — never called on the normal/expected path.
function establishSession() {
  sessionJarPromise ??= (async () => {
    const jar = new Map();
    try {
      const res = await politeGet(`${BASE}/`, FETCH_OPTS);
      harvestCookies(res, jar);
    } catch (err) {
      console.error(`  tomaszow-mazowiecki: session establish failed: ${err.message}`);
    }
    return jar;
  })();
  return sessionJarPromise;
}

/** Fetch a bip.tomaszow.miasta.pl page; retry once with a session cookie if
 *  the CMS serves the homepage instead of the requested content (see header).
 *  @param {string} url @returns {Promise<string>} */
async function fetchPage(url) {
  const html = await getText(url, FETCH_OPTS);
  if (!looksLikeHomepageRedirect(html)) return html;
  console.error(`  tomaszow-mazowiecki: homepage redirect on ${url} — establishing session + retrying once`);
  const jar = await establishSession();
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const retry = await proxyFetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: 'follow',
  });
  if (!retry.ok) throw new Error(`http ${retry.status} on ${url}`);
  return retry.text();
}

// ---------------------------------------------------------------------------
// Board parsing — every board (announcements/results/an item sub-page's
// attachment list) server-renders a flat `<li class="element_podkategorii">`
// list; chunk on that marker rather than one large regex so per-row markup
// quirks (extra whitespace, an optional trailing counter row) can't break the
// whole board.
// ---------------------------------------------------------------------------

const ITEM_MARKER = '<li class="element_podkategorii">';

function splitBoardItems(html) {
  const h = html || '';
  const idxs = [];
  let i = h.indexOf(ITEM_MARKER);
  while (i !== -1) {
    idxs.push(i);
    i = h.indexOf(ITEM_MARKER, i + ITEM_MARKER.length);
  }
  const chunks = [];
  for (let k = 0; k < idxs.length; k++) {
    const end = k + 1 < idxs.length ? idxs[k + 1] : h.length;
    chunks.push(h.slice(idxs[k], end));
  }
  return chunks;
}

// Announcements-board row: a SUB-PAGE link (no file yet), e.g.
// `<a href="/public/?id=239781" class="nazwa_pliku nourl">TITLE</a>`.
const SUBPAGE_LINK_RE = /<a href="\/public\/\?id=(\d+)"[^>]*class="nazwa_pliku nourl"[^>]*>([^<]*)<\/a>/;

/** @param {string} html the announcements board's HTML
 *  @returns {Array<{id:string, title:string, url:string}>} */
export function announcementItemsFromBoard(html) {
  const items = [];
  for (const chunk of splitBoardItems(html)) {
    const m = SUBPAGE_LINK_RE.exec(chunk);
    if (!m) continue;
    items.push({ id: m[1], title: htmlToText(m[2]), url: `${BASE}/?id=${m[1]}` });
  }
  return items;
}

// A direct file-link row (results board rows, AND an announcement sub-page's
// own attachment rows — same markup shape): e.g.
// `<a href="/public/getFile?id=623585" ...class="nazwa_pliku" ><img.../><span>TITLE</span></a>`
// followed (results board only) by a `udostepnil_data">(YYYY-MM-DD ...)` date.
const FILE_LINK_RE = /<a href="\/public\/(getFile\?id=(\d+))"[^>]*class="nazwa_pliku"[^>]*>[\s\S]*?<span>([^<]*)<\/span>/;
const UDOSTEPNIL_DATE_RE = /udostepnil_data">\((\d{4}-\d{2}-\d{2})/;

/** @param {string} html a board or item-sub-page's HTML
 *  @returns {Array<{url:string, id:string, title:string, date:string|null}>} */
export function fileItemsFromBoard(html) {
  const items = [];
  for (const chunk of splitBoardItems(html)) {
    const m = FILE_LINK_RE.exec(chunk);
    if (!m) continue;
    const dateM = UDOSTEPNIL_DATE_RE.exec(chunk);
    items.push({ url: `${BASE}/${m[1]}`, id: m[2], title: htmlToText(m[3]), date: dateM ? dateM[1] : null });
  }
  return items;
}

// Among a sub-page's attachments (mapa/regulamin/oświadczenia/ogłoszenie),
// pick the real announcement — always named "Ogłoszenie o ... przetargu..."
// on every live fixture (Zielona/Środkowa/Spalska) — falling back to the
// first attachment if none matches (defensive; not expected to fire).
export function pickAnnouncementFile(attachments) {
  return attachments.find((a) => /og[łl]oszeni/i.test(a.title)) || attachments[0] || null;
}

// ---------------------------------------------------------------------------
// Text extraction — born-digital PDF (pdfText) by default; .doc/.docx
// attachments (docText) when the filename says so, OR when pdfText rejects
// the bytes as "not a PDF" (a few result rows are .docx with no extension
// shown in the display title — see crawl.js/config.js notes); ocrPdf when
// pdftotext comes back ~blank (scanned/image-only PDF — the older archive
// rows are scans; a bare "\f" pdftotext output is the tell).
// ---------------------------------------------------------------------------

async function extractText(url, filenameHint) {
  const looksDocLike = /\.docx?$/i.test(filenameHint || '');
  if (looksDocLike) return docText(url, FETCH_OPTS);
  let text;
  try {
    text = await pdfText(url, FETCH_OPTS);
  } catch (err) {
    if (/not a PDF/i.test(err.message)) return docText(url, FETCH_OPTS);
    throw err;
  }
  // Scanned (image-only) PDF: pdftotext yields ~nothing (often a bare \f).
  // Fall through to OCR — same >=120 stripped-chars threshold as
  // oswiecim/crawl.js's attachmentText().
  if (text.replace(/\s+/g, '').length >= 120) return text;
  return ocrPdf(url, FETCH_OPTS);
}

// ---------------------------------------------------------------------------
// crawlActive — announcements board (+ its per-item sub-page attachments)
// ---------------------------------------------------------------------------

export async function crawlActive() {
  const listings = [];
  const land = [];

  let html;
  try {
    html = await fetchPage(ANNOUNCEMENTS_BOARD);
  } catch (err) {
    console.error(`  tomaszow-mazowiecki: announcements board fetch failed: ${err.message}`);
    return { listings, wykaz: [], land };
  }

  const items = announcementItemsFromBoard(html).slice(0, MAX_ANNOUNCEMENT_ITEMS);
  for (const item of items) {
    let subHtml;
    try {
      subHtml = await fetchPage(item.url);
    } catch (err) {
      console.error(`  tomaszow-mazowiecki: item page fetch failed (${item.url}): ${err.message}`);
      continue;
    }
    const attachments = fileItemsFromBoard(subHtml);
    const file = pickAnnouncementFile(attachments);
    if (!file) {
      console.error(`  tomaszow-mazowiecki: no attachment found for "${item.title.slice(0, 60)}"`);
      continue;
    }
    let text;
    try {
      text = await extractText(file.url, file.title);
    } catch (err) {
      console.error(`  tomaszow-mazowiecki: extract failed (${file.url} — "${item.title.slice(0, 60)}"): ${err.message}`);
      continue;
    }
    if (!isAnnouncement(text)) {
      console.error(`  tomaszow-mazowiecki: "${file.title.slice(0, 60)}" doesn't read as an announcement — skipped`);
      continue;
    }
    const rec = parseAnnouncement(text, { url: file.url });
    if (!rec) continue;
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  tomaszow-mazowiecki crawlActive: ${listings.length} listing(s), ${land.length} land item(s)`);
  return { listings, wykaz: [], land };
}

// ---------------------------------------------------------------------------
// crawlResultDocs — results board, newest-first, incremental via known-urls
// ---------------------------------------------------------------------------

// core/known-urls.js only reads properties.json — but on this mixed board most
// result docs are LAND ('grunt' -> data/<city>/land.json), so without this
// union those docs would never count as "known" and the MAX_RESULT_ITEMS
// window would stay pinned to the same newest rows forever instead of
// advancing into the 197-row archive (where the flat results with achieved
// prices live). Reads the same four URL fields core/known-urls.js does;
// fail-safe empty set on first run / missing file.
const LAND_JSON_PATH = fileURLToPath(
  new URL('../../../../data/tomaszow-mazowiecki/land.json', import.meta.url),
);

async function loadKnownLandUrls() {
  try {
    const parsed = JSON.parse(await readFile(LAND_JSON_PATH, 'utf8'));
    const urls = new Set();
    for (const plot of Array.isArray(parsed?.plots) ? parsed.plots : []) {
      for (const l of Array.isArray(plot?.listings) ? plot.listings : []) {
        for (const k of ['source_pdf', 'source_url', 'detail_url', 'pdf_url']) {
          if (l?.[k]) urls.add(l[k]);
        }
      }
    }
    return urls;
  } catch {
    return new Set();
  }
}

export async function crawlResultDocs() {
  const resultRefs = [];

  let html;
  try {
    html = await fetchPage(RESULTS_BOARD);
  } catch (err) {
    console.error(`  tomaszow-mazowiecki: results board fetch failed: ${err.message}`);
    return resultRefs;
  }

  const known = await loadKnownSourceUrls('tomaszow-mazowiecki');
  for (const url of await loadKnownLandUrls()) known.add(url);
  const items = fileItemsFromBoard(html); // newest-first on the live board
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let fetched = 0;
  let reused = 0;

  // KNOWN items are still extracted + emitted — their text is a content-
  // addressed cache hit (no network), and land.json is REBUILT from each
  // crawl's records (refresh.js overwrites it; only properties.json history-
  // merges), so dropping known docs would drop their land history. Only
  // genuinely NEW docs count against MAX_RESULT_ITEMS, which is what lets the
  // backfill window advance ~15 docs per run into the 197-row archive while
  // keeping per-run host load capped.
  for (const item of items) {
    if (Date.now() > deadline) break;
    const isKnown = known.has(item.url);
    if (!isKnown && fetched >= MAX_RESULT_ITEMS) continue;

    let text;
    try {
      text = await extractText(item.url, item.title);
    } catch (err) {
      console.error(`  tomaszow-mazowiecki: result extract failed (${item.url} — "${item.title.slice(0, 60)}"): ${err.message}`);
      continue;
    }
    if (isKnown) reused++;
    else fetched++;
    resultRefs.push({ text, pdf_url: item.url, detail_url: item.url, auction_date: null });
  }

  console.error(
    `  tomaszow-mazowiecki crawlResultDocs: ${fetched} new result doc(s) fetched ` +
      `(${reused} already-known re-emitted from cache, ${items.length} total on board)`,
  );
  return resultRefs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}, land: ${land.length}`);
}
