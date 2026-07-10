// Namysłów city adapter — implements the registry contract (see ../index.js).
//
// Single-host model: zan-namyslow.pl/przetargi/ (WordPress board + post
// permalinks) for active flat-sale auctions. See config.js for full
// rationale and spike notes.
//
//   crawlActive()      → { listings, wykaz: [] }   from zan-namyslow.pl/przetargi/
//   crawlResultDocs()  → []  (stub — ZAN has no flat-results board; see config.js)
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
