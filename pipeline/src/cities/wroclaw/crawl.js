// Wrocław crawler — bip.um.wroc.pl (Logonet eUrząd, server-rendered HTML) +
// gn.um.wroc.pl (Giełda Nieruchomości, secondary achieved-price source).
// See config.js for the two-source achieved-price picture and parse.js for
// the field-extraction groundtruth.
//
// BIP search endpoint (confirmed live 2026-07-16):
//   https://bip.um.wroc.pl/przetargi-nieruchomosci/szukaj
//     ?kind_id=3        "lokal mieszkalny" (the only kind this adapter tracks)
//     &status=0|2       0 = Aktualne, 2 = Rozstrzygnięte
//     &perPage=N&page=N
// Each result row AND the article detail page itself render an identical
// `<table class="table table-borderless">` "Szczegóły" block — parse.js's
// parseListingBlocks() handles both shapes with one parser.
//
// RODO window (live-verified): a resolved article's "Informacja o wyniku"
// .docx attachment is present only ~7 days after the auction date. The
// "Rozstrzygnięte" search is newest-first, so crawlResultDocs() only needs to
// scan the first few pages to catch every doc still inside its window.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import { htmlToText, parsePLN } from '../../core/finn-bip.js';
import {
  parseListingBlocks,
  blockToListing,
  addressRawFromLabel,
  roundFromPrzetargNa,
  areaFromAnnouncementText,
} from './parse.js';

const ORIGIN = 'https://bip.um.wroc.pl';
const SEARCH_URL = `${ORIGIN}/przetargi-nieruchomosci/szukaj`;
const GIELDA_ORIGIN = 'https://gn.um.wroc.pl';

const KIND_FLAT = 3;     // "lokal mieszkalny" — the only kind_id this adapter tracks
const STATUS_ACTIVE = 0; // "Aktualne"
const STATUS_RESOLVED = 2; // "Rozstrzygnięte"
const PER_PAGE = 25;
const MAX_PAGES_ACTIVE = 15;   // safety cap — real "Aktualne" volume is far smaller
const MAX_PAGES_RESULT = 5;    // newest-first; only recent pages fall inside the 7-day doc window
const ENRICH_AREA_LIMIT = 200; // bound the per-listing announcement-.docx fetch pass

// Giełda sequential-ID scan window. Confirmed live 2026-07-16: ids ~1097-1310
// resolve (HTTP 200); 1320+ 500s (past the current max). Bump GIELDA_ID_START
// forward periodically as the catalog grows — this is a SUPPLEMENTARY source
// (recent-window backfill), not the primary achieved-price stream.
const GIELDA_ID_START = 1050;
const GIELDA_MAX_SCAN = 400;   // hard cap on ids probed this run
const GIELDA_FAIL_STREAK_STOP = 8; // consecutive non-200s ⇒ past the current max

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

function searchUrl(status, page) {
  return `${SEARCH_URL}?kind_id=${KIND_FLAT}&status=${status}&perPage=${PER_PAGE}&page=${page}`;
}

async function fetchSearchPage(status, page) {
  try {
    return await getText(searchUrl(status, page), FETCH_OPTS);
  } catch (err) {
    console.error(`  wroclaw search fetch failed (status=${status} page=${page}): ${err.message}`);
    return null;
  }
}

// ---- crawlActive -------------------------------------------------------------

export async function crawlActive() {
  const listings = [];
  for (let page = 1; page <= MAX_PAGES_ACTIVE; page++) {
    const html = await fetchSearchPage(STATUS_ACTIVE, page);
    if (!html) break;
    const blocks = parseListingBlocks(html);
    if (blocks.length === 0) break;
    for (const b of blocks) {
      const rec = blockToListing(b);
      if (rec) listings.push(rec);
    }
  }
  console.error(`  wroclaw crawlActive: ${listings.length} lokal mieszkalny listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// The first "Ogłoszenie (wersja tekstowa)" .docx/.doc attachment link on a
// detail page whose label matches `labelRe`.
function attachmentUrlByLabel(detailHtml, labelRe) {
  const re = /<a id="attachments-title"[^>]*href="([^"]+)">\s*([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(detailHtml)) !== null) {
    if (labelRe.test(m[2])) return m[1];
  }
  return null;
}

/**
 * Fill area_m2 for active listings by fetching each detail page (to find the
 * "Ogłoszenie (wersja tekstowa)" attachment) then the attachment itself.
 * Bounded to ENRICH_AREA_LIMIT listings/run. Optional per the adapter
 * contract — refresh.js calls it only if present.
 * @param {object[]} active  mutated in place
 */
export async function enrichActive(active) {
  let recovered = 0;
  let attempted = 0;
  for (const l of active) {
    if (l.area_m2 != null) continue;
    if (attempted >= ENRICH_AREA_LIMIT) break;
    attempted++;
    try {
      const detailHtml = await getText(l.detail_url, FETCH_OPTS);
      const docUrl = attachmentUrlByLabel(detailHtml, /Og[łl]oszenie\s*\(wersja\s*tekstowa\)/i);
      if (!docUrl) continue;
      const text = await docText(docUrl, FETCH_OPTS);
      const area = areaFromAnnouncementText(text);
      if (area != null) { l.area_m2 = area; recovered++; }
    } catch (err) {
      console.error(`  wroclaw enrich: failed for ${l.address_raw}: ${err.message}`);
    }
  }
  console.error(`  wroclaw enrichActive: recovered area for ${recovered}/${attempted} attempted listing(s)`);
}

// ---- crawlResultDocs: BIP result .docx (primary) ----------------------------

function buildRefText({ addressRaw, round, startingPricePln, auctionDate, body }) {
  const header = [
    `ADRES: ${addressRaw}`,
    `RUNDA: ${round}`,
    startingPricePln != null ? `CENA_WYWOLAWCZA: ${startingPricePln}` : null,
    auctionDate ? `DATA: ${auctionDate}` : null,
  ].filter(Boolean).join('\n');
  return `${header}\n---\n${body}`;
}

async function crawlBipResultRefs() {
  const refs = [];
  for (let page = 1; page <= MAX_PAGES_RESULT; page++) {
    const html = await fetchSearchPage(STATUS_RESOLVED, page);
    if (!html) break;
    const blocks = parseListingBlocks(html);
    if (blocks.length === 0) break;
    for (const b of blocks) {
      const kind = classifyKind(`${b.rodzaj} ${b.przetargNa}`);
      if (kind !== 'mieszkalny' || !b.detailUrl) continue;
      let detailHtml;
      try {
        detailHtml = await getText(b.detailUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  wroclaw result detail fetch failed (${b.detailUrl}): ${err.message}`);
        continue;
      }
      const docUrl = attachmentUrlByLabel(detailHtml, /Informacja\s+o\s+wyniku/i);
      if (!docUrl) continue; // outside the ~7-day RODO publication window
      let body;
      try {
        body = await docText(docUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  wroclaw doc-text failed (${docUrl}): ${err.message}`);
        continue;
      }
      const addressRaw = addressRawFromLabel(b.addressLabel);
      if (!addressRaw) continue;
      refs.push({
        text: buildRefText({
          addressRaw,
          round: roundFromPrzetargNa(b.przetargNa),
          startingPricePln: parsePLN(b.cenaText),
          auctionDate: b.auctionDate,
          body,
        }),
        pdf_url: docUrl,
        detail_url: b.detailUrl,
        auction_date: b.auctionDate,
      });
    }
  }
  return refs;
}

// ---- crawlResultDocs: Giełda Nieruchomości (secondary/backfill) -------------

function gieldaAddressFromHtml(html) {
  const m = /details-title-offer">\s*<b>\s*(?:Ulica\s+)?([^<]+?)\s*<\/b>/i.exec(html || '');
  return m ? `ul. ${m[1].trim()}` : null;
}

// Strict digit-group pattern (see parse.js's amountsInText doc comment for
// why: a loose `[\d\s.]*` run can swallow stray adjacent-field digits).
function gieldaPriceField(text, label) {
  const re = new RegExp(`${label}:\\s*(\\d{1,3}(?:[ .]\\d{3})*,\\d{2})\\s*z[łl]`, 'i');
  const m = re.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

function gieldaAuctionDate(text) {
  const m = /Data przetargu:\s*(\d{2})\.(\d{2})\.(\d{4})/.exec(text || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

async function fetchGielda(id) {
  try {
    return await getText(`${GIELDA_ORIGIN}/oferta/lokal/${id}`, FETCH_OPTS);
  } catch (err) {
    return null;
  }
}

/**
 * Bounded forward scan of Giełda's sequential lot IDs. Only lots with a
 * parseable "Cena uzyskana:" (achieved price) become result refs — that's
 * the only field this source adds over the BIP stream, and it's absent
 * (rendered "-") for anything not yet resolved. Addresses come from Giełda's
 * own nominative "Ulica X Y" heading, which is NOT guaranteed to match the
 * genitive form BIP labels use for the same building (a known, systemic
 * genitive/nominative key-drift already handled post-hoc by
 * core/build-properties.js's healStreetVariants — not re-solved here).
 */
async function crawlGieldaResultRefs() {
  const refs = [];
  let failStreak = 0;
  for (let i = 0; i < GIELDA_MAX_SCAN && failStreak < GIELDA_FAIL_STREAK_STOP; i++) {
    const id = GIELDA_ID_START + i;
    const html = await fetchGielda(id);
    if (!html) { failStreak++; continue; }
    failStreak = 0;

    // gieldaPriceField's label:...value regex needs the FLATTENED text — the
    // raw HTML has the <li>label</li>...<li>value</li> tags in between.
    const text = htmlToText(html);
    const achieved = gieldaPriceField(text, 'Cena uzyskana');
    if (achieved == null) continue; // not yet resolved / no recorded price

    const addressRaw = gieldaAddressFromHtml(html);
    if (!addressRaw) continue;
    const address = parseAddress(addressRaw);
    if (!address) continue;

    const startingPricePln = gieldaPriceField(text, 'Cena wywoławcza');
    const auctionDate = gieldaAuctionDate(text);
    const detailUrl = `${GIELDA_ORIGIN}/oferta/lokal/${id}`;

    refs.push({
      text: buildRefText({ addressRaw, round: 1, startingPricePln, auctionDate, body: text }),
      pdf_url: detailUrl,
      detail_url: detailUrl,
      auction_date: auctionDate,
    });
  }
  console.error(`  wroclaw Giełda scan: ids ${GIELDA_ID_START}-${GIELDA_ID_START + GIELDA_MAX_SCAN - 1}, ${refs.length} resolved-price lot(s)`);
  return refs;
}

// ---- crawlResultDocs ---------------------------------------------------------

export async function crawlResultDocs() {
  const bipRefs = await crawlBipResultRefs();
  const gieldaRefs = await crawlGieldaResultRefs();
  console.error(`  wroclaw crawlResultDocs: ${bipRefs.length} BIP result doc(s), ${gieldaRefs.length} Giełda result(s)`);
  return [...bipRefs, ...gieldaRefs];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
