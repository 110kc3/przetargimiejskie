// Poddębice city adapter — implements the registry contract (see
// ../index.js).
//
// devcomm "bipv45" JSON-list + born-digital text-PDF board. Thin/marginal
// build: recurring but sparse, bursty flat auctions + land-dominated volume,
// NO achieved-price/result stream on this board — crawlResultDocs() returns
// [] by design (see crawl.js / config.js). parseResultDoc is implemented per
// the adapter contract but is ungroundtruthed (no live example exists).
//
// See spikes/lodzkie/powiat-poddebicki/poddebice.md.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
