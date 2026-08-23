// Tczew crawler.
//
// Source: bip.tczew.pl — IDcom.pl bip-v1 platform, server-rendered HTML.
//
//   CURRENT LIST (authoritative live board):
//     https://bip.tczew.pl/wiadomosci/3/lista/1/przetargi
//   DETAIL:
//     https://bip.tczew.pl/wiadomosci/3/wiadomosc/{ID}/{slug}
//   ATTACHMENT (static CDN):
//     https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/{ID}/files/{filename}.pdf
//
// List page HTML (confirmed live 2026-06-27):
//   <div class="wiadomosci ajaxContener">
//     <div class="t1 clickable">
//       <div class="contener">
//         <p class="title"><a href="https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/{ID}/{slug}">
//           Title text
//         </a></p>
//       </div>
//     </div>
//   </div>
//
// Detail page (same response for announcement and result entries):
//   - <h2 class="header">Title</h2>  — full title
//   - <div class="wiadomosc">…</div> — body (often empty; text lives in PDF)
//   - <div class="t1 attachment"><a href="https://bip-v1-files.idcom-jst.pl/…/files/name.pdf">
//   - Rejestr zmian: "Data wytworzenia dokumentu: <span>DD-MM-YYYY</span>"
//
// Crawl strategy:
//   crawlActive():       scan list for entries whose title contains "przetarg" +
//                        "lokal mieszkalny" (or "sprzedaż lokal") but NOT "wynik".
//                        Fetch the detail page and announcement PDF so its
//                        auction date, price and area are not lost.
//                        Return listings with outcome:'active'.
//   crawlResultDocs():   scan same list for entries whose title contains "wynik" +
//                        "lokal mieszkalny". Fetch detail page, extract PDF attachment URL.
//                        Return registry-contract refs with
//                        { pdf_url, auction_date, detail_url }.
//
// No bot-block detected (standard fetch UA works). Static CDN on idcom-jst.pl
// also unblocked.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAddress } from '../../core/normalize.js';
import {
  areaFromText,
  auctionDateFromText,
  parseResultDoc,
  startingPriceFromText,
} from './parse.js';

const ORIGIN = 'https://bip.tczew.pl';
const MAX_PAGES = 10;

export function currentListUrl(page = 1) {
  return `${ORIGIN}/wiadomosci/3/lista/${page}/przetargi`;
}

// ---- list-page parser -------------------------------------------------------
//
// Extracts all announcement/result entries from the IDcom.pl list page HTML.
// Structure confirmed live 2026-06-27:
//   <div class="wiadomosci ajaxContener">
//     <div class="t1 clickable"><div class="contener">
//       <p class="title"><a href="URL">Title</a></p>
//     </div></div>
//   </div>
//
// There are NO dates on the list items — dates only appear on the detail page
// ("Data wytworzenia dokumentu" in Rejestr zmian).

const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a><\/p>/g;

/**
 * Parse the IDcom.pl list-page HTML, return all entries.
 * @param {string} html
 * @returns {Array<{url: string, title: string}>}
 */
export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    const title = m[2].trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

// ---- detail-page helpers ----------------------------------------------------

/**
 * Extract publication date from detail page "Rejestr zmian" section.
 * HTML pattern: "Data wytworzenia dokumentu: <span>DD-MM-YYYY</span>"
 * @param {string} html
 * @returns {string|null} ISO date (YYYY-MM-DD) or null
 */
export function publishedDateFromDetail(html) {
  if (!html) return null;
  const m = /Data wytworzenia dokumentu:\s*<span>(\d{2})[.-](\d{2})[.-](\d{4})(?:\s*r\.)?/i.exec(html);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // fallback: "Data wprowadzenia dokumentu do BIP: <span>DD miesiac YYYY HH:MM</span>"
  const PL_MONTHS = {
    stycznia: '01', lutego: '02', marca: '03', kwietnia: '04',
    maja: '05', czerwca: '06', lipca: '07', sierpnia: '08',
    września: '09', pazdziernika: '10', października: '10',
    listopada: '11', grudnia: '12',
  };
  const m2 = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(html);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Extract the first PDF attachment URL from a detail page.
 * HTML pattern:
 *   <div class="t1 attachment">
 *     <a href="https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/{ID}/files/{name}.pdf" …>
 * Also handles relative hrefs (resolves against ORIGIN).
 * @param {string} html
 * @returns {string|null}
 */
export function attachmentPdfFromDetail(html) {
  if (!html) return null;
  // Prefer an explicit .pdf href in the attachment div
  const attachSection = /class="t1 attachment"[\s\S]*?<\/div>/i.exec(html)?.[0] ?? html;
  const pdfM = /href="([^"]+\.pdf[^"]*)"/i.exec(attachSection);
  if (!pdfM) return null;
  const href = pdfM[1].replace(/&amp;/g, '&');
  if (/^https?:\/\//i.test(href)) return href;
  try { return new URL(href, ORIGIN).href; } catch { return null; }
}

// ---- crawlActive ------------------------------------------------------------
//
// Announcements: titles matching "przetarg" + residential sale but NOT
// "wynik". The active board is low-volume, so fetching the announcement PDF is
// cheap and gives us a real auction date (critical for aging removed listings).

export function isAnnouncementTitle(title) {
  const t = title.toLowerCase();
  return (
    /(?:przetarg\w*\s+ustn\w*|ustn\w*\s+przetarg\w*)/i.test(t) &&
    /lokal\w*\s+mieszkaln/i.test(t) &&
    /sprzeda[żz]/i.test(t) &&
    !/najem|dzier[żz]aw/i.test(t) &&
    !/wynik/i.test(t)
  );
}

function isResultTitle(title) {
  const t = title.toLowerCase();
  return /wynik/i.test(t) && /lokal\w*\s+mieszkaln/i.test(t);
}

/**
 * Extract round from list-page title.
 * "I przetarg" → 1, "II przetarg" → 2, etc.
 * @param {string} title
 * @returns {number|null}
 */
export function roundFromTitle(title) {
  const t = (title || '').toLowerCase();
  // Roman numeral before "przetarg"
  const roman = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(title);
  if (roman) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const val = ROMAN[roman[1].toLowerCase()];
    if (val) return val;
  }
  // Polish ordinal word
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrugiego|drugi/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  if (/\bpi[ąa]t/i.test(t)) return 5;
  return null;
}

/**
 * Coarse address extraction from title.
 * "… lokalu mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4 …"
 * → "ul. Elżbiety 4/5" → parseAddress()
 * @param {string} title
 * @returns {import('../../core/normalize.js').ParsedAddress|null}
 */
export function addressFromTitle(title) {
  if (!title) return null;
  // Extract apt number from "lokalu … nr <N>"
  const aptM = /lokal\w*\s+(?:mieszkaln\w+\s+)?(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(title);
  const apt = aptM ? aptM[1] : null;
  // Extract street + building from "przy ul. <Street> <Building>" or "przy ul. <Street> <N>"
  const addrM =
    /przy\s+(?:ul\.|al\.|os\.|pl\.)?\s*([A-ZŁŚĆĘĄÓŹŻŃ][^,]+?)\s+(\d+[A-Za-z]?)(?:\s*[,.]|$|\s+\w)/i.exec(
      title,
    );
  if (!addrM) return null;
  const street = addrM[1].replace(/\s+$/, '');
  const building = addrM[2];
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return parseAddress(raw);
}

let boardPromise = null;

async function crawlCurrentBoard() {
  const entries = [];
  const seen = new Set();
  let verified = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = currentListUrl(page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  tczew: current Przetargi page ${page} fetch failed: ${err.message}`);
      break;
    }
    const found = parseListPage(html);
    if (page === 1) {
      // A non-empty parsed list, or the CMS's explicit empty-state message,
      // proves that we reached the intended board rather than a challenge or a
      // silently changed layout.
      verified = found.length > 0 || /Brak wiadomo[śs]ci w kategorii:\s*Przetargi/i.test(html);
    }
    let added = 0;
    for (const entry of found) {
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
      entries.push(entry);
      added++;
    }
    if (added === 0) break;
  }
  console.error(`  tczew: ${entries.length} current Przetargi entry/entries crawled`);
  return { entries, verified };
}

function getCurrentBoard() {
  boardPromise ??= crawlCurrentBoard();
  return boardPromise;
}

export async function crawlActive() {
  const { entries, verified } = await getCurrentBoard();
  const announcements = entries.filter((e) => isAnnouncementTitle(e.title));
  console.error(`  tczew: list has ${entries.length} entries, ${announcements.length} flat announcement(s)`);

  const listings = [];
  for (const entry of announcements) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  tczew: detail fetch failed (${entry.url}): ${err.message}`);
    }
    const published_date = detailHtml ? publishedDateFromDetail(detailHtml) : null;
    const pdfUrl = detailHtml ? attachmentPdfFromDetail(detailHtml) : null;
    let announcementText = '';
    if (pdfUrl) {
      try {
        announcementText = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  tczew: announcement PDF failed (${pdfUrl}): ${err.message}`);
      }
    }
    const address = addressFromTitle(entry.title);
    const round = roundFromTitle(entry.title);

    if (!address) {
      console.error(`  tczew: could not parse address from title: "${entry.title}"`);
    }

    listings.push({
      kind: 'mieszkalny',
      address_raw: entry.title,
      address,
      auction_date: auctionDateFromText(announcementText),
      published_date,
      round,
      area_m2: areaFromText(announcementText),
      starting_price_pln: startingPriceFromText(announcementText),
      detail_url: entry.url,
      source_pdf: pdfUrl,
    });
  }

  console.error(`  tczew active: ${listings.length} listing(s)`);
  return {
    listings,
    wykaz: [],
    land: [],
    valid_empty: verified && announcements.length === 0,
  };
}

// ---- crawlResultDocs --------------------------------------------------------
//
// Scans the same list for result notices ("wynik" + "lokal mieszkalny").
// Fetches each result notice detail page to get the PDF attachment URL.
// Returns refs: { pdf_url, auction_date, detail_url }
// The refresh loop then calls pdfText(pdfUrl) + parseResultDoc(text, date, url).

export async function crawlResultDocs() {
  const { entries } = await getCurrentBoard();
  const resultEntries = entries.filter((e) => isResultTitle(e.title));
  console.error(`  tczew: ${resultEntries.length} result notice(s) found`);

  const refs = [];
  for (const entry of resultEntries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  tczew: result detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }
    const pdfUrl = attachmentPdfFromDetail(detailHtml);
    if (!pdfUrl) {
      console.error(`  tczew: no PDF attachment found on result page ${entry.url}`);
      continue;
    }
    // The result parser normally extracts the actual auction date from the
    // attachment. Publication date is only a conservative fallback.
    const publishedDate = publishedDateFromDetail(detailHtml);
    refs.push({
      pdf_url: pdfUrl,
      auction_date: publishedDate,
      detail_url: entry.url,
    });
  }

  console.error(`  tczew: ${refs.length} result PDF ref(s)`);
  return refs;
}
