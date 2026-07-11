// Szczecinek crawler — server-rendered Logonet BIP (no SPA, no OCR, no TLS
// workaround; see config.js). Two independent board families:
//
//   ZBYCIE (announcements + wykazy): board 336's own page lists YEAR
//   sub-boards (645=2026, 595=2025, 547=2024, …), discovered live so a new
//   year needs no code change. Each year board is paginated 10/page.
//
//   RESULTS (achieved-price stream): board 338, its OWN separate pagination
//   (7 pages / ~65 items as of the build) — never interleaved with the
//   zbycie boards, so it's crawled independently.
//
//   LIST:    /artykuly/<catId>/<page>/<perPage>/<slug>
//   ARTICLE: /artykul/<catId>/<docId>/<slug>
//   FILE:    /attachments/download/<fileId>   (a born-digital PDF, when present)
//
// Announcements are parsed straight from the HTML body (extractBodyText) —
// verified live that the inline text already carries every field, so no PDF
// fetch is needed for the active/wykaz stream (unlike TG/KK, which are
// PDF-only). Results are different: a solo lokal-mieszkalny result is
// published as a bare STUB (no PDF, no price anywhere — confirmed live,
// repeat-fetch byte-identical), while a land/mixed-batch result carries a PDF
// with a per-parcel table. So for board 338 we always fetch the article HTML
// first; when it links a PDF attachment we ALSO fetch+extract that (pdfText)
// and prefer its text (it's where the achieved price actually lives),
// falling back to the HTML stub text when there's no attachment.
//
// source:'html' ⇒ result refs always carry `.text` directly; refresh.js's
// OCR/pdf-text dispatch is bypassed (see refresh.js: it still reads
// `ref.pdf_url` for logging/provenance even under source:'html', so every ref
// carries a `pdf_url` — the real PDF URL when one exists, else the article's
// own page URL as a never-null fallback).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncement,
  parseResultDoc,
  isResultNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  extractBodyText,
  resultDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.szczecinek.pl';
const ZBYCIE_ROOT = { id: 336, slug: 'nieruchomosci-przeznaczone-do-zbycia' };
const RESULTS_BOARD = { id: 338, slug: 'informacja-o-wynikach-przetargow-na-sprzedaz-nieruchomosci' };

// Known year sub-boards as of the build — used ONLY if live discovery from
// the 336 root page ever comes back empty (defensive fallback; see
// discoverYearBoards). Verified live 2026-07-10.
const FALLBACK_YEAR_BOARDS = [
  { id: 645, slug: '2026' },
  { id: 595, slug: '2025' },
  { id: 547, slug: '2024' },
];

const PER_PAGE = 10;
// CI-budget bound (ADAPTER-GUIDE §5.1): real boards are 2-3 pages (zbycie
// years) / 7 pages (results) today; this leaves generous headroom without
// letting a future archive run unbounded.
const MAX_PAGES = 40;

const listUrl = (catId, page, slug) => `${ORIGIN}/artykuly/${catId}/${page}/${PER_PAGE}/${slug}`;
const articleUrl = (catId, docId, slug) => `${ORIGIN}/artykul/${catId}/${docId}/${slug}`;

/** Article refs {id, slug, url} from one board-listing page's HTML. */
export function parseListingPage(html, catId) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = new RegExp(`href="[^"]*?/artykul/${catId}/(\\d+)/([a-z0-9-]+)"`, 'g');
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, id, slug] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, slug, url: articleUrl(catId, id, slug) });
  }
  return out;
}

/** Walk one board's pages (bounded by MAX_PAGES), collecting article refs.
 *  Stops when a page yields no NEW ref (past the last page, or a pagination
 *  loop) or returns fewer than a full page. */
async function listBoardAllPages(catId, slug) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(listUrl(catId, page, slug));
    } catch (err) {
      console.error(`  szczecinek board ${catId} page ${page} failed: ${err.message}`);
      break;
    }
    const pageRefs = parseListingPage(html, catId);
    const fresh = pageRefs.filter((r) => !seen.has(r.id));
    if (fresh.length === 0) break;
    for (const r of fresh) {
      seen.add(r.id);
      refs.push(r);
    }
    if (pageRefs.length < PER_PAGE) break; // short page ⇒ last page
  }
  return refs;
}

/** Year sub-boards under the zbycie root (336), discovered live from that
 *  page's own subcategory links so a newly added year needs no code change.
 *  Falls back to FALLBACK_YEAR_BOARDS if discovery ever comes back empty
 *  (layout change / transient fetch failure). */
async function discoverYearBoards() {
  try {
    const html = await getText(`${ORIGIN}/artykuly/${ZBYCIE_ROOT.id}/${ZBYCIE_ROOT.slug}`);
    const re = /href="[^"]*?\/artykuly\/(\d+)\/(20\d{2})"/g;
    const seen = new Set();
    const found = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const [, id, year] = m;
      if (seen.has(id)) continue;
      seen.add(id);
      found.push({ id: Number(id), slug: year, year: Number(year) });
    }
    if (found.length) {
      found.sort((a, b) => b.year - a.year);
      return found;
    }
    console.error('  szczecinek: year-board discovery found nothing, using fallback list');
  } catch (err) {
    console.error(`  szczecinek: year-board discovery failed (${err.message}), using fallback list`);
  }
  return FALLBACK_YEAR_BOARDS;
}

/** First PDF attachment URL on an article page, or null. */
function firstAttachmentUrl(html) {
  const m =
    /<a[^>]*id="attachments-title"[^>]*href="([^"]+)"/i.exec(html || '') ||
    /href="(https:\/\/bip\.szczecinek\.pl\/attachments\/download\/\d+)"/i.exec(html || '');
  return m ? m[1] : null;
}

// One memoised pass over both board families — see the file header.
let crawlPromise = null;

async function crawlZbycie() {
  const listings = [];
  const land = [];
  const yearBoards = await discoverYearBoards();
  for (const board of yearBoards) {
    const refs = await listBoardAllPages(board.id, board.slug);
    console.error(`  szczecinek board ${board.id} (${board.slug}): ${refs.length} article(s)`);
    for (const ref of refs) {
      if (isSkippableTitle('', ref.slug)) continue;
      if (isResultTitle('', ref.slug)) continue; // results live on board 338, never here
      let html;
      try {
        html = await getText(ref.url);
      } catch (err) {
        console.error(`  szczecinek: article ${ref.id} fetch failed: ${err.message}`);
        continue;
      }
      const text = extractBodyText(html);
      if (!text) continue;
      if (isResultNotice(text)) continue; // defensive: body says result despite slug/board
      const rec = parseAnnouncement(text);
      if (!rec) {
        if (isAnnouncementTitle('', ref.slug)) {
          console.error(`  szczecinek WARN: announcement not parsed (article ${ref.id}, ${ref.slug.slice(0, 70)})`);
        }
        continue;
      }
      const enriched = { ...rec, detail_url: ref.url, source_url: ref.url };
      (rec.kind === 'grunt' ? land : listings).push(enriched);
    }
  }
  return { listings, land };
}

async function crawlResults() {
  const resultRefs = [];
  const refs = await listBoardAllPages(RESULTS_BOARD.id, RESULTS_BOARD.slug);
  console.error(`  szczecinek board ${RESULTS_BOARD.id} (results): ${refs.length} article(s)`);
  for (const ref of refs) {
    let html;
    try {
      html = await getText(ref.url);
    } catch (err) {
      console.error(`  szczecinek: result article ${ref.id} fetch failed: ${err.message}`);
      continue;
    }
    const bodyText = extractBodyText(html);
    if (!bodyText || !isResultNotice(bodyText)) continue;
    const boilerplateDate = resultDateFromText(bodyText);

    const pdfUrl = firstAttachmentUrl(html);
    let text = bodyText;
    let pdf_url = ref.url; // never-null fallback provenance (stub results have no PDF)
    if (pdfUrl) {
      pdf_url = pdfUrl;
      try {
        const pdfTxt = await pdfText(pdfUrl);
        if (pdfTxt && pdfTxt.trim()) text = pdfTxt;
      } catch (err) {
        console.error(`  szczecinek: result PDF extract failed ${pdfUrl}: ${err.message}`);
      }
    }
    resultRefs.push({ text, pdf_url, auction_date: boilerplateDate });
  }
  return resultRefs;
}

async function crawlAll() {
  const [{ listings, land }, resultRefs] = await Promise.all([crawlZbycie(), crawlResults()]);
  console.error(
    `  szczecinek: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result document(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result documents (achieved-price stream, board 338). */
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
      },
      null,
      2,
    ) + '\n',
  );
}
