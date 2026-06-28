// Stargard city adapter — implements the registry contract (see ../index.js).
//
// Dual-source:
//   crawlActive()      → TBS WordPress announcements → active flat listings
//   crawlResultDocs()  → BIP Wyniki przetargów notices → result docs
//   parseResultDoc()   → parse one BIP doc into result records
//
// Achieved price is in PDF only — parseResultDoc emits achieved_price_pln:null
// until PDF parsing is added in a future pass.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
