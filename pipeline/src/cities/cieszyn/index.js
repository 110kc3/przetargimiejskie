import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Cieszyn adapter — Logonet CMS 2.9.0 (bip.um.cieszyn.pl).
//
// crawlActive()       → { listings, wykaz:[], land:[] }
//   Flat-sale announcements from the paginated index, enriched from detail
//   pages. Land / commercial / lease entries are filtered out.
//
// crawlResultDocs()   → [{ text, detail_url, auction_date }]
//   Wynik articles fetched live from their per-auction URL
//   (/artykul/21/{id}/...). source:'html' means each ref already carries
//   .text; refresh.js passes it directly to parseResultDoc.
//   ⚠️ Wynik articles expire ~30 days post-auction; missed windows are gone.
//
// parseResultDoc(text, fallbackDate, sourceUrl)
//   Parses a wynik article body into a concluded-auction record.
//   Joins its announcement by address key + round in build-properties.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
