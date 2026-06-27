import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Racibórz adapter. Two separate boards on bipraciborz.pl:
//   crawlActive()      → active sale announcements (sprzedaż board, paginated)
//   crawlResultDocs()  → result notices (wyniki board, small, no pagination)
//
// source:'html' means each result ref already carries `.text` (extracted in crawl.js),
// so refresh.js hands it directly to parseResultDoc without going through the OCR path.
//
// Flat results join their announcement via address key (street_norm|building|apt) + round
// in build-properties (same mechanism as Tarnowskie Góry, Katowice, etc.).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
