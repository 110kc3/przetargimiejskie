// Pleszew city adapter — implements the registry contract (see ../index.js).
//
// Single host (bip.pleszew.pl, WOKISS BIP, plain server-rendered HTML — no
// render.js needed). See config.js for full rationale and spike notes.
//
//   crawlActive()      → { listings, wykaz, land }  from the current +
//                          previous year consolidated boards
//   crawlResultDocs()  → Array<{text, auction_date, pdf_url}>  from the SAME
//                          boards' "Informacja o wyniku przetargu" links
//   parseResultDoc()   → Array<ResultRecord>  groundtruthed against real
//                          sold AND unsold result PDFs (see parse.js)

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
