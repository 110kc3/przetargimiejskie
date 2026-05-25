// Katowice city adapter — implements the registry contract (see ../index.js).
//
//   crawlActive()     — sale-auction announcements -> active listings (with round)
//   crawlResultDocs() — "wyniki przetargów" result-PDF references
//   parseResultDoc()  — result-PDF table (pdftotext -layout) -> sold records
//
// Result-PDF table parsing is a v1: built against a single sample (see
// SPIKE-WAVE1.md). Parser notes flag any row it cannot fully place.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultPdf } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc: parseResultPdf,
  crawlActive,
};
