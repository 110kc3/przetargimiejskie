// Szamotuły city adapter — implements the registry contract (see ../index.js).
//
// Single mixed board:
//   bip.szamotuly.pl (menu 1247 "Przetargi")
//
//   crawlActive()      → { listings, wykaz, land, valid_empty, valid_empty_land }
//   crawlResultDocs()  → Array<{text, auction_date, pdf_url, detail_url}>
//   parseResultDoc()   → Array<ResultRecord>

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
