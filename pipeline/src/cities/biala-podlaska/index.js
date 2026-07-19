// Biała Podlaska city adapter — implements the registry contract (see
// ../index.js). ZGL Biała Podlaska Sp. z o.o. (zglbp.pl) publishes open flat/
// commercial/parcel auctions, announcement-only (no achieved-price stream).
// See crawl.js for the full source-shape rationale.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
