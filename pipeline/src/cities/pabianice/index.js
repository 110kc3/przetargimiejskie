// Pabianice city adapter — implements the registry contract (see ../index.js).
//
// Source: bip.um.pabianice.pl (Logonet BIP 2.9.0)
// Scope: lokal mieszkalny, przetarg ustny nieograniczony only.
// Spike: spikes/lodzkie/powiat-pabianicki/pabianice.md (VERDICT: BUILD, Low effort).
//
//   crawlActive()       → { listings, wykaz:[], land:[] }
//                         Inline HTML metadata from the list board; no PDF fetch.
//   crawlResultDocs()   → [{ text, pdf_url, detail_url, auction_date }]
//                         "Rozstrzygnięcie przetargu" PDFs, one per concluded auction.
//   parseResultDoc()    → 0 or 1 result record per PDF (sold/unsold).
//
// source:'html' → crawlResultDocs() refs carry `.text`; refresh.js passes
// the text directly to parseResultDoc without an additional fetch.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
