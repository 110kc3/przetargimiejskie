// Kłodzko city adapter — implements the registry contract (see ../index.js).
//
// Single BIP category (menu=346) at um.bip.klodzko.pl carries both
// flat-sale announcements and result notices (with cena nabycia). The crawler
// classifies each item by its title text and returns the two streams
// independently. No PDF extraction needed — full text is inline in the HTML.
//
//   crawlActive()      → { listings, wykaz:[] }   flat announcements from active board
//   crawlResultDocs()  → [{ text, detail_url }]   result notices (achieved price)
//   parseResultDoc()   → []|[record]              parse one result notice text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
