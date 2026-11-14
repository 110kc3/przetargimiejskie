import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { directFetch, getText, politeGet } from '../../core/fetch.js';
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

const MAX_ANNOUNCEMENT_ITEMS = 20;
const MAX_RESULT_ITEMS = Number(process.env.TOMASZOW_MAX_RESULT_ITEMS) || 15;
const CRAWL_BUDGET_MS = Number(process.env.TOMASZOW_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


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

async function fetchPage(url) {
  const html = await getText(url, FETCH_OPTS);
  if (!looksLikeHomepageRedirect(html)) return html;
  console.error(`  tomaszow-mazowiecki: homepage redirect on ${url} — establishing session + retrying once`);
  const jar = await establishSession();
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const retry = await directFetch(url, {
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

const SUBPAGE_LINK_RE = /<a href="\/public\/\?id=(\d+)"[^>]*class="nazwa_pliku nourl"[^>]*>([^<]*)<\/a>/;

export function announcementItemsFromBoard(html) {
  const items = [];
  for (const chunk of splitBoardItems(html)) {
    const m = SUBPAGE_LINK_RE.exec(chunk);
    if (!m) continue;
    items.push({ id: m[1], title: htmlToText(m[2]), url: `${BASE}/?id=${m[1]}` });
  }
  return items;
}

const FILE_LINK_RE = /<a href="\/public\/(getFile\?id=(\d+))"[^>]*class="nazwa_pliku"[^>]*>[\s\S]*?<span>([^<]*)<\/span>/;
const UDOSTEPNIL_DATE_RE = /udostepnil_data">\((\d{4}-\d{2}-\d{2})/;

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

export function pickAnnouncementFile(attachments) {
  return attachments.find((a) => /og[łl]oszeni/i.test(a.title)) || attachments[0] || null;
}


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
  if (text.replace(/\s+/g, '').length >= 120) return text;
  return ocrPdf(url, FETCH_OPTS);
}


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
  const items = fileItemsFromBoard(html);
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let fetched = 0;
  let reused = 0;

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


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}, land: ${land.length}`);
}
