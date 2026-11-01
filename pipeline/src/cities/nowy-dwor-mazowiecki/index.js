// Nowy Dwór Mazowiecki adapter
//
// Gmina Miejska Nowy Dwór Mazowiecki (powiat nowodworski, mazowieckie)

import { CONFIG } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  ...CONFIG,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
