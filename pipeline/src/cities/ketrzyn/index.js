// Kętrzyn city adapter — implements the registry contract (see ../index.js).
//
// Source: bip.miastoketrzyn.pl (modern gov.pl-style card BIP). source:'html' —
// the adapter extracts attachment text itself.
//   crawlActive()     → { listings, wykaz:[], land:[] }  (upcoming auctions:
//                       flats/commercial address-keyed + land parcel-keyed)
//   crawlResultDocs() → result refs with `.text` already extracted (born-digital
//                       PDF via pdfText, or inline result-card HTML)
//   parseResultDoc()  → achieved price + outcome (sold/unsold) per auction
//
// See config.js / crawl.js / parse.js and
// spikes/warminsko-mazurskie/powiat-ketrzynski/ketrzyn.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
