// Strzelce Krajeńskie adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.strzelce.pl — SYSTEMDOBIP.PL/E-LINE, one board doubling
// as both the announcement AND (nominally) the results engine:
//   Active:   /przetargi/29/status/0/   — crawlActive()     → { listings, wykaz:[], land }
//   Resolved: /przetargi/29/status/1/   — crawlResultDocs() → result refs (source:'html')
//   parseResultDoc()  → achieved price + outcome per flat/land parcel
//
// See: spikes/lubuskie/powiat-strzelecko-drezdenecki/strzelce-krajenskie.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
