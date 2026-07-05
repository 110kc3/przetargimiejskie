// Bełchatów city adapter — implements the registry contract (see ../index.js).
//
// Single-host model: belchatow.pl WordPress REST API for both active flat
// auctions and (when published) result notices. See config.js for the full
// channel rationale.
//
//   crawlActive()      → { listings, wykaz: [] }     flat-sale prose posts
//   crawlResultDocs()  → Array<{text, date, url}>    "informacja o wyniku" posts
//   parseResultDoc()   → Array<ResultRecord>         from result-notice text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
