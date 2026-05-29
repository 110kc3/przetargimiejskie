// Bytom city adapter — implements the registry contract (see ../index.js).
//
// Bytom is the simplest adapter in the registry: a single server-rendered HTML
// catalog (i-BIIP "Katalog nieruchomości do zbycia") carries every active
// sale auction with all fields inline, so there is no OCR, no PDF, and no
// results stream wired yet. See crawl.js for the full rationale and the
// sold-price-history follow-up.
//
//   crawlResultDocs() → []                 (no machine-readable results yet)
//   parseResultDoc()  → []                 (stub — never called while above is [])
//   crawlActive()     → { listings, wykaz:[] }   from the i-BIIP catalog

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
