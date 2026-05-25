// Gliwice city adapter. Implements the contract every city in the registry
// must satisfy (see ../index.js):
//
//   id, label, authority, host, source   — metadata (from config.js)
//   crawlResultDocs()  → [{ pdf_url, auction_date, ... }]
//   parseResultDoc(text, date, url) → [auctionRecord, ...]
//   crawlActive()      → { listings, wykaz }
//   enrichActive(active)            — optional, mutates listings in place
//   crawlDetailAreas() → Map<propertyKey, area_m2>   — optional
//
// The crawl/parse logic lives in sibling files; this module is only glue.

import { config } from './config.js';
import { crawlAllResultPdfs } from './crawl-results.js';
import { crawlActive } from './crawl-active.js';
import { crawlDetailAreas } from './crawl-detail-areas.js';
import { augmentActiveWithWadium } from './augment-active.js';
import { parseResultPdf } from './parse-result.js';

export default {
  ...config,
  crawlResultDocs: crawlAllResultPdfs,
  parseResultDoc: parseResultPdf,
  crawlActive,
  enrichActive: augmentActiveWithWadium,
  crawlDetailAreas,
};
