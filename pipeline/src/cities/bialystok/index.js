// Białystok city adapter — implements the registry contract (see ../index.js).
//
// Active stream:  crawlActive() paginates the BIP Otwarty index (no JS needed;
//                 offset-based pagination with pagination[offset]=N), fetches
//                 each flat's detail page, returns one active listing per flat.
// Results stream: crawlResultDocs() paginates Rozstrzygnięty + Nierozstrzygnięty
//                 indexes, fetches each flat's detail page, returns pre-parsed
//                 field-text refs; parseResultDoc() extracts achieved prices.
//
// See crawl.js and parse.js for implementation details.
// See spikes/podlaskie/bialystok/bialystok.md for the spike verdict.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
