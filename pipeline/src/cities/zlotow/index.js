// Złotów city adapter.
//
// Gmina Miasto Złotów — Nefeni BIPv2 Next.js SSR BIP.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
