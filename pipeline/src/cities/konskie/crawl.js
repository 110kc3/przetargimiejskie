// Końskie crawler — bip.umkonskie.pl, IDcom.pl bip-v1, site 46779.
// Confirmed live 2026-07-10.
//
//   LIST (board 5027, "Nieruchomości"):
//     https://bip.umkonskie.pl/wiadomosci/5027/lista/{page}/nieruchomosci
//   DETAIL:
//     https://bip.umkonskie.pl/wiadomosci/5027/wiadomosc/{id}/{slug}
//   ATTACHMENT (static CDN):
//     https://bip-v1-files.idcom-jst.pl/sites/46779/wiadomosci/{id}/files/{filename}.pdf
//
// List page HTML is the same IDcom.pl template as Giżycko/Tczew:
//   <p class="title"><a href="{DETAIL_URL}">{Title}</a></p>
//
// Detail pages are COVER SHEETS ONLY — confirmed live (no "tresc"/"wiadomosc"
// body text on either an announcement or a result page): title (h2.header),
// "Data wytworzenia dokumentu: <span>DD.MM.YYYY</span>", one PDF attachment
// link under div.t1.attachment. All substance is in the PDF (see parse.js).
//
// Board 5027 is a GENERAL property board — it mixes lokal mieszkalny (flat),
// land (działka/nieruchomość niezabudowana/zabudowana) and dzierżawa/najem/
// użyczenie (lease) notices in one chronological feed, and unlike Gizycko/
// Tczew the title never states the kind ("Informacja o wynikach przetargu -
// ul. Mieszka I" is a flat; "... - Pomyków" is land; both look identical).
// Cheap title-prefix filters (isAnnouncementTitle/isResultTitle) rule out
// wykaz/lease/restricted/cancelled entries WITHOUT a fetch; every remaining
// candidate's PDF is fetched and gated on flatKindFromText() === 'mieszkalny'
// (see parse.js) before being kept — confirmed live: roughly 2 in 3 board
// entries are land/village plot sales, not flats.
//
// crawlActive() and crawlResultDocs() each do their OWN bounded page walk
// (not a shared/memoized one — this repo's split-analog convention, see
// tczew/gizycko) so `crawlActive()` alone stays cheap for ad-hoc checks;
// crawlResultDocs() walks deeper because the achieved-price stream is the
// one that benefits from history. Volume is the lowest tier observed in this
// codebase (0 flat events in 2024) so both windows are generous relative to
// actual traffic.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  normalizeText,
  flatKindFromText,
  parseAnnouncement,
  publishedDateFromDetail,
  attachmentPdfUrlFromDetail,
} from './parse.js';

const ORIGIN = 'https://bip.umkonskie.pl';
const BOARD = '5027';

// Board has ~99 pages of history (confirmed live) at ~10 entries/page: bound
// each walk well under that so a CI run can never approach the 25-min budget.
// crawlActive only needs to catch anything CURRENTLY undecided (a handful of
// recent months); crawlResultDocs benefits from deeper history for the
// achieved-price stream.
const MAX_PAGES_ACTIVE = 8;
const MAX_PAGES_RESULTS = 20;

export function boardPageUrl(page) {
  return `${ORIGIN}/wiadomosci/${BOARD}/lista/${page}/nieruchomosci`;
}

// ---- list-page parser --------------------------------------------------------

const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a><\/p>/g;

/** @param {string} html @returns {Array<{url:string, title:string}>} */
export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&').trim();
    const title = m[2].trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

// ---- title-level gates (cheap — skip before any fetch) ----------------------

/** "Ogłoszenie - ... przetarg ... nieograniczony ..." sale announcement, not a
 *  wykaz/lease/restricted/cancelled notice. Kind (flat vs land) is NOT
 *  decidable from the title on this board — that gate is flatKindFromText() on
 *  the fetched PDF text, applied later in crawlActive(). */
export function isAnnouncementTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  if (!/og[łl]oszenie/.test(t)) return false;
  if (!/przetarg/.test(t)) return false;
  if (/wynik|informacj/.test(t)) return false;
  if (/odwo[łl]a|uniewa[żz]ni/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/dzier[żz]aw|najem|u[żz]yczeni/.test(t)) return false;
  return true;
}

/** "Informacja o wynikach przetargu - ..." result notice. Same kind caveat. */
export function isResultTitle(title) {
  if (!title) return false;
  return /informacj\w*\s+o\s+wynik/i.test(title);
}

// ---- shared helpers -----------------------------------------------------------

async function walkBoard(maxPages) {
  const entries = [];
  const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    let html;
    try {
      html = await getText(boardPageUrl(page));
    } catch (err) {
      console.error(`  konskie: board page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseListPage(html);
    if (items.length === 0) break; // past the last page
    let added = 0;
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      entries.push(item);
      added++;
    }
    console.error(`  konskie: board page ${page}: ${items.length} entries (${added} new)`);
  }
  return entries;
}

/** Fetch a board entry's detail page, then its PDF attachment text. */
async function fetchAttachmentText(entryUrl) {
  let detailHtml = '';
  try {
    detailHtml = await getText(entryUrl);
  } catch (err) {
    console.error(`  konskie: detail fetch failed (${entryUrl}): ${err.message}`);
    return null;
  }
  const publishedDate = publishedDateFromDetail(detailHtml);
  const pdfUrl = attachmentPdfUrlFromDetail(detailHtml);
  if (!pdfUrl) {
    console.error(`  konskie: no PDF attachment on ${entryUrl}`);
    return null;
  }
  let text = '';
  try {
    text = await pdfText(pdfUrl);
  } catch (err) {
    console.error(`  konskie: pdf-text failed (${pdfUrl}): ${err.message}`);
    return null;
  }
  return { text, pdfUrl, publishedDate };
}

// ---- crawlActive --------------------------------------------------------------

export async function crawlActive() {
  const entries = await walkBoard(MAX_PAGES_ACTIVE);
  const candidates = entries.filter((e) => isAnnouncementTitle(e.title));
  console.error(
    `  konskie: crawlActive — ${entries.length} board entries (${MAX_PAGES_ACTIVE} pages), ${candidates.length} announcement candidate(s)`,
  );

  const listings = [];
  let discardedNonFlat = 0;
  for (const entry of candidates) {
    const fetched = await fetchAttachmentText(entry.url);
    if (!fetched) continue;
    if (flatKindFromText(normalizeText(fetched.text)) !== 'mieszkalny') {
      discardedNonFlat++;
      continue;
    }
    const rec = parseAnnouncement(fetched.text, {
      detailUrl: entry.url,
      publishedDate: fetched.publishedDate,
    });
    if (!rec) {
      console.error(`  konskie: announcement did not parse (address?) — ${entry.url}`);
      continue;
    }
    listings.push(rec);
  }
  console.error(
    `  konskie: crawlActive — ${listings.length} flat listing(s), ${discardedNonFlat} non-flat discarded`,
  );
  return { listings, wykaz: [], land: [] };
}

// ---- crawlResultDocs ------------------------------------------------------------
//
// Returns refs shaped for refresh.js (source:'html' ⇒ it reads `ref.text`
// directly rather than calling pdfText/ocrPdf itself): { text, pdf_url,
// detail_url, auction_date }. `auction_date` here is the detail page's
// publication date (used only as parseResultDoc's fallbackDate — the real
// auction date is extracted from the PDF text itself when present).

export async function crawlResultDocs() {
  const entries = await walkBoard(MAX_PAGES_RESULTS);
  const candidates = entries.filter((e) => isResultTitle(e.title));
  console.error(
    `  konskie: crawlResultDocs — ${entries.length} board entries (${MAX_PAGES_RESULTS} pages), ${candidates.length} result candidate(s)`,
  );

  const refs = [];
  let discardedNonFlat = 0;
  for (const entry of candidates) {
    const fetched = await fetchAttachmentText(entry.url);
    if (!fetched) continue;
    if (flatKindFromText(normalizeText(fetched.text)) !== 'mieszkalny') {
      discardedNonFlat++;
      continue;
    }
    refs.push({
      text: fetched.text,
      pdf_url: fetched.pdfUrl,
      detail_url: entry.url,
      auction_date: fetched.publishedDate,
    });
  }
  console.error(
    `  konskie: crawlResultDocs — ${refs.length} flat result ref(s), ${discardedNonFlat} non-flat discarded`,
  );
  return refs;
}
