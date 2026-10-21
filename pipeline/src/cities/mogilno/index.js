// Mogilno city adapter — implements the registry contract (see ../index.js).
//
// Volume: low flat auction volume, skews toward land, mill/industrial and tenant sales,
// but runs open oral auctions for residential premises (e.g. Wyrobki 7, Wasielewko 18/3).
// Result notices with achieved prices published on category 101 (and 265).
//
// See spikes/kujawsko-pomorskie/powiat-mogilenski/mogilno.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
