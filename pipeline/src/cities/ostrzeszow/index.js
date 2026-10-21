// Ostrzeszów city adapter — implements the registry contract (see ../index.js).
//
// Dual source:
// 1. City BIP: ostrzeszow.nowoczesnagmina.pl (category c=1274)
// 2. Housing manager ZGM BIP: bip.zgm-ostrzeszow.pl (category id=31 / id=32)
//
//   crawlActive()      → { listings, wykaz, land, valid_empty, valid_empty_land }
//   crawlResultDocs()  → Array<{text, auction_date, pdf_url}>
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
