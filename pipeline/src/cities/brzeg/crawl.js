// Brzeg crawler.
//
// Two-source strategy (see config.js + spikes/opolskie/powiat-brzeski/brzeg.md):
//
// crawlActive():
//   Fetches brzeg.pl/gminne-nieruchomosci-do-sprzedazy/ (WordPress, server-
//   rendered, no bot-block observed).  Parses inline fields (address, kind,
//   round, cena wywoławcza, termin, BIP link).  Returns { listings, wykaz:[] }.
//
// crawlResultDocs():
//   Polls the BIP year+month hierarchy at bip.brzeg.pl/przetargi,9_1-YYYY-M
//   for the current year + previous year, collecting active item pages
//   (href=/przetargi,9_1-YYYY-M_NNN — NOT yet archived to /archiwum,7_5_NNN).
//   Each active page is fetched; if it contains a "Informacja o wyniku…" PDF
//   attachment, that PDF URL is returned as a result document.
//   Returns Array<{text, date, url}> suitable for parseResultDoc.
//
// Architecture note:
//   Active items stay at /przetargi,9_1-YYYY-M_NNN while the przetarg is open
//   or its result PDF has just been attached.  Once "archived" by the BIP admin,
//   they move to /archiwum,7_5_NNN where content is hidden ("Zawartość ukryta").
//   We therefore never fetch /archiwum pages for result data.
//
// NOTE (confirm on first CI refresh):
//   - The result-PDF text parser (parse.js parseResultDoc) was not verified
//     against a live PDF during the spike.  Validate on first run.
//   - The brzeg.pl listing page is manually maintained and may lag behind BIP.
//     It is the crawlActive() source only; BIP drives crawlResultDocs().

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseListingPage, parseBipIndexMonth, parseBipItemPage, parseResultDoc } from './parse.js';

const LISTING_URL = 'https://brzeg.pl/gminne-nieruchomosci-do-sprzedazy/';
const BIP_BASE = 'https://bip.brzeg.pl';
const BIP_TYPE_PATH = '/przetargi,9_1'; // ustny nieograniczony

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FETCH_OPTS = { userAgent: BROWSER_UA };

// Years to scan when harvesting result docs: current + previous.
function yearsToScan() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

// All month numbers 1-12.
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// ---------------------------------------------------------------------------
// crawlActive — brzeg.pl listing page
// ---------------------------------------------------------------------------

export async function crawlActive() {
  let html;
  try {
    html = await getText(LISTING_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  brzeg: listing page fetch failed (${LISTING_URL}): ${err.message}`);
    return { listings: [], wykaz: [] };
  }

  const listings = parseListingPage(html);
  console.error(`  brzeg crawlActive: ${listings.length} flat listing(s) from brzeg.pl`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs — BIP year+month scan for result PDFs
// ---------------------------------------------------------------------------

// Fetch one BIP month-index page and collect active item page URLs.
async function collectActiveItemUrls(year, month) {
  const url = `${BIP_BASE}${BIP_TYPE_PATH}-${year}-${month}`;
  let html;
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    // 404 = no items for this month+year — normal, not an error.
    if (!/\b404\b/.test(err.message)) {
      console.error(`  brzeg BIP month ${year}-${month} fetch failed: ${err.message}`);
    }
    return [];
  }
  return parseBipIndexMonth(html);
}

export async function crawlResultDocs() {
  const resultDocs = [];

  for (const year of yearsToScan()) {
    for (const month of ALL_MONTHS) {
      const activeItems = await collectActiveItemUrls(year, month);
      if (activeItems.length === 0) continue;

      console.error(`  brzeg BIP ${year}-${month}: ${activeItems.length} active item(s)`);

      for (const item of activeItems) {
        // Only process flat-sale przetarg items (filter by title)
        if (!/lokal\s+mieszkaln/i.test(item.title)) continue;

        let pageHtml;
        try {
          pageHtml = await getText(item.url, FETCH_OPTS);
        } catch (err) {
          console.error(`  brzeg BIP item fetch failed (${item.url}): ${err.message}`);
          continue;
        }

        const parsed = parseBipItemPage(pageHtml, item.url);
        if (!parsed || !parsed.resultPdf) continue;

        // Fetch and extract text from the result PDF
        let text;
        try {
          text = await pdfText(parsed.resultPdf, FETCH_OPTS);
        } catch (err) {
          console.error(`  brzeg result PDF text failed (${parsed.resultPdf}): ${err.message}`);
          continue;
        }

        resultDocs.push({
          text,
          date: parsed.publishedDate,
          url: parsed.resultPdf,
        });
        console.error(`  brzeg: found result doc for "${parsed.title.slice(0, 60)}"`);
      }
    }
  }

  console.error(`  brzeg crawlResultDocs: ${resultDocs.length} result doc(s) found`);
  return resultDocs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
