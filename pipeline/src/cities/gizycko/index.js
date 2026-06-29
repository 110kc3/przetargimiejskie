// Giżycko city adapter — implements the registry contract (see ../index.js).
//
// Volume: ~4–6 flat auction notices/year (often the same flat re-run I–V times).
// Active listings are parsed directly from HTML body (area, price, auction date).
// Result PDFs are scanned images (Xerox WorkCentre 7225) — parseResultDoc
// always returns []. Achieved-price stream requires OCR to be useful.
//
// See spikes/warminsko-mazurskie/powiat-gizycki/gizycko.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
