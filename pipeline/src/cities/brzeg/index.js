// Brzeg city adapter — implements the registry contract (see ../index.js).
//
// Two-host model: brzeg.pl (WordPress listing page) for active auctions,
// bip.brzeg.pl (MegaBIP) for result PDFs.  See config.js for full rationale.
//
//   crawlActive()      → { listings, wykaz: [] }     from brzeg.pl listing page
//   crawlResultDocs()  → Array<{text, date, url}>    from bip.brzeg.pl active items
//   parseResultDoc()   → Array<ResultRecord>         from "Informacja o wyniku" PDF text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
