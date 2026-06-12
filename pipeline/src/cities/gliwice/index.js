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
import { crawlActive as crawlActiveZgm } from './crawl-active.js';
import { crawlBipSales, foldBipDuplicates } from './crawl-bip.js';
import { crawlDetailAreas } from './crawl-detail-areas.js';
import { augmentActiveWithWadium } from './augment-active.js';
import { parseResultPdf } from './parse-result.js';

// Gliwice has TWO active sources: the ZGM board (crawl-active.js) and the city
// BIP sale board (crawl-bip.js). crawlActive unions their listings into the one
// {listings, wykaz} the registry contract expects. The BIP crawl is isolated:
// if bip.gliwice.eu is down it logs a warning and the ZGM listings still ship,
// rather than failing the whole city. wykaz remains ZGM-only (the BIP board
// publishes no wykaz pre-announcements).
async function crawlActive() {
  const zgm = await crawlActiveZgm();
  let bip = [];
  try {
    bip = await crawlBipSales();
  } catch (err) {
    console.error(`  WARN: BIP (bip.gliwice.eu) crawl failed (${err.message}); ZGM listings only.`);
  }
  // Fold BIP rows that duplicate a ZGM auction into a secondary source link
  // (bip_url) rather than emitting a second row; BIP-only auctions are kept.
  const listings = foldBipDuplicates([...zgm.listings, ...bip]);
  return { listings, wykaz: zgm.wykaz };
}

export default {
  ...config,
  crawlResultDocs: crawlAllResultPdfs,
  parseResultDoc: parseResultPdf,
  crawlActive,
  enrichActive: augmentActiveWithWadium,
  crawlDetailAreas,
};
