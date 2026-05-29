// Zabrze city adapter — implements the registry contract (see ../index.js).
//
// Active-listings adapter: the city BIP "Lokale mieszkalne" board is crawled
// (round + auction date per announcement), each announcement's attachment is
// extracted and parsed into per-flat active listings. No separate results
// stream, so crawlResultDocs() is [] and parseResultDoc() is a stub. See
// crawl.js / config.js for the CI-validation caveats (attachment format +
// pagination param).

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
