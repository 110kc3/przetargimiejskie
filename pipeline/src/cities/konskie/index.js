// Końskie city adapter — implements the registry contract (see ../index.js).
//
// Volume: lowest tier in this codebase — roughly 2-3 flat auction events/year,
// single flat at a time across multiple rounds, 0 events in 2024. Both
// announcement and result documents are born-digital text PDFs (pdftotext,
// no OCR) fetched by crawl.js itself; result records are genuinely parseable
// (achieved-price extraction is extrapolated/unvalidated — see parse.js
// header). Board 5027 also carries land/lease notices; this adapter is
// scoped to flats only (land: [] always, matching the gizycko/tczew analogs).
//
// See spikes/swietokrzyskie/powiat-konecki/konskie.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
