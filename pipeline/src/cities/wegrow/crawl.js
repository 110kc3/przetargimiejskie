// Węgrów crawler — server-rendered Logonet BIP, board 345 ("Ogłoszenia
// sprzedaży") consumed via its GENERIC article-board XML feed (see config.js
// for why this differs from both named analogs). No SPA, no auth, no TLS
// workaround.
//
//   BOARD XML:  https://bip.wegrow.com.pl/artykuly/xml/345/{page}/1
//                 (found via the board HTML's own `<a class="xml">` link —
//                 the spike's documented `/api/menu/345/articles` 404s, and
//                 the Śląskie-analog `/przetargi-nieruchomosci/xml/...`
//                 module returns 0 records: Węgrów doesn't use that
//                 dedicated real-estate-tender submodule)
//                 -> <ilosc-stron> pages, each <artykul> giving {url, tytul,
//                 data} — a TITLE + publish-date, NOT structured fields.
//   ARTICLE:    https://bip.wegrow.com.pl/artykul/345/{id}/{slug}
//                 -> a "Załączniki" (#attachments) section listing every
//                 attachment; the article's own notice PDF is always in
//                 there (REAL BUG vs the spike: the spike claimed "inline
//                 HTML text, no PDF gate" — live-verified false; the article
//                 BODY is empty-or-attachment-links-only on every substantive
//                 record sampled, the real text is 100% in the PDF).
//   ATTACHMENT: https://bip.wegrow.com.pl/attachments/download/{attId}
//                 -> every ogłoszenie/informacja-o-wyniku PDF sampled live
//                 (2024-2026) is a 300dpi SCAN (pdftotext returns 0-2 chars,
//                 pdffonts lists none) — needs ocrPdf, not pdfText. (The
//                 spike's "OCR unlikely on this CMS" is also live-disproven
//                 for this board; wykaz PDFs, which we never fetch, are the
//                 ones that happen to be native Word exports.)
//
// Title-based routing happens BEFORE any article is fetched (see parse.js
// isSkippableTitle/isResultTitle/isAnnouncementTitle), so skipped items never
// cost a request:
//   - ANY "wykaz" (bezprzetargowo tenant sale, pre-przetarg designation,
//     property exchange/darowizna) is skipped uniformly. Per ADAPTER-GUIDE,
//     a pre-przetarg designation wykaz could in principle seed the `wykaz`
//     stream build-properties.js supports (`outcome:'announced'`) — but ZERO
//     shipped adapters in this repo actually populate that stream (all ship
//     `wykaz: []`), the property in question reliably gets a fully-dated
//     listing within weeks once the real "Ogłoszenie przetargu" is published
//     (verified live: article 12091's wykaz 22.01.2026 -> article 12148's
//     ogłoszenie 18.03.2026, same flat, same price), and wykaz PDFs are
//     dense multi-column TABLES that OCR unreliably (tesseract's default PSM
//     scrambles the column order) — so skipping them (title-only, no fetch)
//     is the robust choice here, matching every existing adapter's
//     convention.
//   - "Informacja(e) o wyniku ..." -> result stream.
//   - "(Ogłoszenie o) [<ordinal>] przetarg[u] na sprzedaż/zbycie
//     nieruchomości ..." -> active-listing stream. Explicitly excludes
//     "sprzedaż RUCHOMOŚCI" (movable equipment from a defunct wholesaler,
//     articles 10501/10578 — NOT real estate; "ruchomości" without the
//     "nie-" prefix is the tell, same technique classify-kind.js uses for
//     zabudowana/niezabudowana).
//   - Cancellations ("odwołanie"), qualified-bidder lists, and anything
//     unclassifiable are skipped (with a WARN for the unclassifiable case).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'https://bip.wegrow.com.pl';
const CATEGORY = 345;

// A browser UA — this Logonet host serves the XML feed to the bot UA too, but
// a browser UA is the safe default for municipal WAFs (harmless if unneeded).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';
const FETCH_OPTS = { userAgent: UA };

// Hard cap so a broken/looping feed can never run forever. The board is 1
// page / 64 records as of 2026-07-10 and grows a handful a year (low volume,
// per the spike).
const MAX_PAGES = 30;

// CI budget guard: age dateless pending announcements older than this into the
// archive via the article's XML publish date. 90 days mirrors the analogs.
const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

// A PDF whose extracted text is shorter than this is treated as "pdftotext
// found nothing" (a scan) rather than "a genuinely short document" — every
// scanned notice sampled live yields exactly 0-2 stray chars from pdftotext.
const MIN_TEXT_LEN = 40;

const boardXmlUrl = (page) => `${ORIGIN}/artykuly/xml/${CATEGORY}/${page}/1`;

/** DD.MM.YYYY (the XML board's <data>, an article publish date) -> ISO, or null. */
function xmlDateToIso(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/**
 * Board-XML page -> article refs. Real shape (verified live):
 *   <artykul><url>…</url><tytul>…</tytul><data>DD.MM.YYYY</data><skrot>
 *   <![CDATA[]]></skrot></artykul>
 * @param {string} xml
 * @returns {Array<{id:string, url:string, tytul:string, published_date:string|null}>}
 */
export function parseBoardPage(xml) {
  if (!xml) return [];
  const out = [];
  const seen = new Set();
  const re = /<artykul>\s*<url>([^<]+)<\/url>\s*<tytul>([^<]*)<\/tytul>\s*<data>([^<]*)<\/data>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, url, tytul, data] = m;
    const idMatch = /\/artykul\/\d+\/(\d+)\//.exec(url);
    const id = idMatch ? idMatch[1] : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url: url.trim(), tytul: tytul.trim(), published_date: xmlDateToIso(data) });
  }
  return out;
}

/** Total board pages from page-1's <ilosc-stron>, bounded by MAX_PAGES. */
async function fetchPageCount() {
  try {
    const xml = await getText(boardXmlUrl(1), FETCH_OPTS);
    const m = /<ilosc-stron>(\d+)<\/ilosc-stron>/.exec(xml);
    return { first: xml, pages: m && Number(m[1]) > 0 ? Math.min(Number(m[1]), MAX_PAGES) : 1 };
  } catch (err) {
    console.error(`  wegrow: board page 1 failed: ${err.message}`);
    return { first: null, pages: 0 };
  }
}

/**
 * The primary notice attachment URL + its link label for one article, from
 * its "Załączniki" (#attachments) section — the ONE extraction path that
 * works across both article-page generations sampled live (pre-2025 articles
 * have no inline body paragraph at all — see article 10953 — only this
 * section; newer articles duplicate the same links inline, in the same
 * order). Prefers an attachment whose label exactly matches the board's
 * <tytul> (observed on every multi-attachment announcement, e.g. article
 * 12186's Ogłoszenie/Regulamin/Mapka×2/Zdjęcie×2 — the Ogłoszenie one wins),
 * falling back to the section's FIRST attachment (correct even when the
 * label is a shortened paraphrase of the title, e.g. article 10953's
 * "Ogłoszenie o drugim przetargu" attachment label vs its longer article
 * title).
 * @param {string} html  article detail page HTML
 * @param {string} tytul the board XML's title for this article
 * @returns {string|null}
 */
export function primaryAttachmentUrl(html, tytul) {
  const sec = /<section id="attachments"[^>]*>([\s\S]*?)<\/section>/i.exec(html || '');
  const scope = sec ? sec[1] : html || '';
  const re = /<a id="attachments-title"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  let first = null;
  const wantedNorm = (tytul || '').replace(/\s+/g, ' ').trim().toLowerCase();
  while ((m = re.exec(scope)) !== null) {
    const url = m[1];
    const label = m[2].replace(/\s+/g, ' ').trim();
    if (!first) first = url;
    if (wantedNorm && label.toLowerCase() === wantedNorm) return url;
  }
  return first;
}

/** Extract a PDF's text: try the fast native-text path first (a few older
 *  wykaz-adjacent attachments ARE native, per the header comment), falling
 *  back to OCR when pdftotext comes back empty/too-short (every
 *  ogłoszenie/wynik notice sampled live is a scan). */
async function extractPdfText(url) {
  try {
    const t = await pdfText(url, FETCH_OPTS);
    if (t && t.trim().length >= MIN_TEXT_LEN) return t;
  } catch {
    // not a text PDF (or not a PDF at all) — fall through to OCR
  }
  return ocrPdf(url, FETCH_OPTS);
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats + houses)
  const land = [];     // kind:'grunt' active records -> land.json
  const resultRefs = []; // { text, pdf_url, auction_date }

  const { first, pages } = await fetchPageCount();
  const refs = [];
  const seenIds = new Set();
  for (let page = 1; page <= pages; page++) {
    let xml = page === 1 ? first : null;
    if (!xml) {
      try {
        xml = await getText(boardXmlUrl(page), FETCH_OPTS);
      } catch (err) {
        console.error(`  wegrow: board page ${page} failed: ${err.message}`);
        continue;
      }
    }
    const pageRefs = parseBoardPage(xml);
    if (pageRefs.length === 0) break; // past the last page
    for (const r of pageRefs) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      refs.push(r);
    }
  }

  let skippedTitle = 0;
  for (const ref of refs) {
    if (isSkippableTitle(ref.tytul)) { skippedTitle++; continue; }
    let role = null;
    if (isResultTitle(ref.tytul)) role = 'result';
    else if (isAnnouncementTitle(ref.tytul)) role = 'ann';
    if (!role) {
      console.error(`  wegrow: unclassified title, skipping (article ${ref.id}): ${ref.tytul.slice(0, 80)}`);
      continue;
    }

    let html;
    try {
      html = await getText(ref.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  wegrow: article ${ref.id} fetch failed: ${err.message}`);
      continue;
    }
    const attUrl = primaryAttachmentUrl(html, ref.tytul);
    if (!attUrl) {
      console.error(`  wegrow: no attachment found on article ${ref.id} (${ref.tytul.slice(0, 60)})`);
      continue;
    }
    let body;
    try {
      body = await extractPdfText(attUrl);
    } catch (err) {
      console.error(`  wegrow: attachment extract failed ${attUrl}: ${err.message}`);
      continue;
    }
    const text = buildRecordText({ title: ref.tytul, body });

    if (role === 'result') {
      resultRefs.push({ text, pdf_url: ref.url, auction_date: ref.published_date });
      continue;
    }

    const parsed = parseAnnouncement(text);
    if (!parsed) {
      console.error(`  wegrow WARN: announcement not parsed (article ${ref.id}, ${ref.tytul.slice(0, 60)})`);
      continue;
    }
    // Stale, dateless pending announcements -> age into the archive via the
    // article's publish date. Harmless when a real auction date was parsed.
    if (!parsed.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
      parsed.auction_date = ref.published_date;
      parsed.auction_date_estimated = true;
    }
    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  wegrow: ${listings.length} flat/house listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s), ${skippedTitle} wykaz/skip title(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved price / negative outcome). source:'html' => refs
 *  carry `.text` already. */
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
        sampleResult: results[0] && { pdf_url: results[0].pdf_url, auction_date: results[0].auction_date },
      },
      null,
      2,
    ) + '\n',
  );
}
