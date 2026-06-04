// Mysłowice city adapter — implements the registry contract (see ../index.js).
//
// Active-listings adapter over the city FINN-BIP (bip.myslowice.pl), built on the
// reusable core/finn-bip.js helper. crawlActive walks the FINN category/search
// indexes, follows each `/artykul/` announcement, keeps the flat-sale auctions
// and emits one active listing per flat. No sold-price stream → crawlResultDocs()
// is [] and parseResultDoc() is a stub. See crawl.js / parse.js / config.js.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
