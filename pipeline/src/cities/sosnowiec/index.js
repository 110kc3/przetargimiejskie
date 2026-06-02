// Sosnowiec city adapter — implements the registry contract (see ../index.js).
//
// Active-listings adapter: the city BIP "Przetargi" board (JSON API) is crawled,
// each open flat-sale auction's article is parsed into one active listing. No
// separate results stream wired, so crawlResultDocs() is [] and parseResultDoc()
// is a stub. See crawl.js / config.js.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
