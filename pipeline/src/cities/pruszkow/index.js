// Pruszków adapter
//
// Gmina Miasto Pruszków (powiat pruszkowski, mazowieckie)

import { CONFIG } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  ...CONFIG,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
