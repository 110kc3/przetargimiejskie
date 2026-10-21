// Grodzisk Mazowiecki city adapter — implements the registry contract (see ../index.js).
//
// Sources:
// - Primary announcements & wykaz: https://nieruchomosci.grodzisk.pl/
// - Concluded results & achieved prices: BIP Grodzisk Mazowiecki (bip.grodzisk.pl)
//
// See config.js for full details and spike notes.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
