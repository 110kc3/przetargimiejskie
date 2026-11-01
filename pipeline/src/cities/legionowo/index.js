// Legionowo adapter
//
// Gmina Miejska Legionowo (powiat legionowski, mazowieckie)

import { CONFIG } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  ...CONFIG,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
