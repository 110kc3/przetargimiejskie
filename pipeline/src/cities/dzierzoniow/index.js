import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Dzierżoniów adapter (bip.um.dzierzoniow.pl — Madkom SIP, a React SPA served
// over a plain JSON HTTP API; NO Playwright/render.js — see config.js/crawl.js).
// One memoised crawl serves both streams:
//   - crawlActive() → { listings, wykaz:[], land:[] }. Flats (lokale
//     mieszkalne) from the "Lokale mieszkalne" board (menu 1838); each carries
//     an "Ogłoszenie …" PDF with price/date/round. Only future-dated auctions
//     are returned as active.
//   - crawlResultDocs() → concluded "Informacja o rozstrzygnięciu przetargów"
//     PDFs from the "Wyniki przetargów" archive (menu 63). source:'html' ⇒ each
//     ref carries the pre-extracted `.text` (pdftotext of the day's PDF) plus
//     the `pdf_url`/`auction_date` refresh.js hands to parseResultDoc, which
//     splits the numbered list and keeps only the flats.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
