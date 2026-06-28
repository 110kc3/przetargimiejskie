// Tczew city adapter — implements the registry contract (see ../index.js).
//
// Volume: ~2–5 flat auctions/year (low, but genuine ustny przetarg nieograniczony).
// Result notices with achieved price are PDF attachments (text-PDF, parseable).
// TTBS (Tczewskie Towarzystwo Budownictwa Społecznego) is a bonus second publisher
// on tbs.tczew.pl — not wired here yet (low volume, no BIP discipline).
//
// See spikes/pomorskie/powiat-tczewski/tczew.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
