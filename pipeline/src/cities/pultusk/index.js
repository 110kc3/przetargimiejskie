// Pułtusk city adapter — implements the registry contract (see ../index.js).
//
// Single-host model: pultusk.pl WordPress REST API for active flat + land
// sale auctions. See config.js for full rationale and spike notes.
//
//   crawlActive()      → { listings, wykaz: [], land }  from pultusk.pl/wp-json
//   crawlResultDocs()  → []  (stub — no achieved-price stream; see config.js)
//   parseResultDoc()   → []  (stub — see parse.js)

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
