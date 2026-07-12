// Żnin city adapter — implements the registry contract (see ../index.js).
//
// Source: bip.gminaznin.pl ("System Rada"/eSesja BIP, server-rendered HTML;
// browser-UA required, no render.js). See config.js + parse.js for the full
// source map and the unsold-only achieved-price rationale.
//
//   crawlActive()      → { listings, wykaz: [], land: [] }  board → per-notice HTML
//                        (land rides `listings`; refresh.js partitions kind 'grunt')
//   crawlResultDocs()  → Array<{text, pdf_url, auction_date}>  superseded rounds
//   parseResultDoc()   → Array<ResultRecord>   round K's HTML → outcome:'unsold'

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
