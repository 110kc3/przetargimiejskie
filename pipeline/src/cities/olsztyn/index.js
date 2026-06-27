// Olsztyn city adapter — implements the registry contract (see ../index.js).
//
// Active stream:  crawlActive() fetches the BIP announcements index (kat. 187)
//                 for flat-sale notices, parses them via parseActiveDoc().
// Results stream: crawlResultDocs() fetches the BIP results index (kat. 188)
//                 for flat-sale result notices; parseResultDoc() extracts the
//                 achieved prices from the inline HTML prose (no PDF needed).
//
// See crawl.js and parse.js for full implementation details.
// See spikes/warminsko-mazurskie/olsztyn/olsztyn.md for the spike verdict.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
