// Gliwice city adapter. Implements the contract every city in the registry
// must satisfy (see ../index.js):
//
//   id, label, authority, host, source   — metadata (from config.js)
//   crawlResultDocs()  → [{ pdf_url, auction_date, ... }]
//   parseResultDoc(text, date, url) → [auctionRecord, ...]
//   crawlActive()      → { listings, wykaz, land }
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
import { crawlMsipLand } from './crawl-land.js';

// Gliwice has THREE active sources:
//   1. ZGM board (crawl-active.js)  — flats, garages, commercial units
//   2. City BIP (crawl-bip.js)      — Prezydent Miasta lokale/garages
//   3. MSIP portal (crawl-land.js)  — city land plots (nieruchomości niezabudowane)
//
// crawlActive unions all three into the one {listings, wykaz, land} the
// registry contract expects. Each secondary source is isolated: if it fails
// the ZGM listings still ship. wykaz remains ZGM-only (neither BIP nor MSIP
// publishes wykaz pre-announcements).
async function crawlActive() {
  const zgm = await crawlActiveZgm();

  let bip = [];
  try {
    bip = await crawlBipSales();
  } catch (err) {
    console.error(`  WARN: BIP (bip.gliwice.eu) crawl failed (${err.message}); ZGM listings only.`);
  }

  // MSIP land plots — isolated so a failure never aborts the flat/commercial crawl.
  let land = [];
  try {
    land = await crawlMsipLand();
  } catch (err) {
    console.error(`  WARN: MSIP land crawl failed (${err.message}); land omitted this run.`);
  }

  // Fold BIP rows that duplicate a ZGM auction into a secondary source link
  // (bip_url) rather than emitting a second row; BIP-only auctions are kept.
  const listings = foldBipDuplicates([...zgm.listings, ...bip]);
  return { listings, wykaz: zgm.wykaz, land };
}

export default {
  ...config,
  crawlResultDocs: crawlAllResultPdfs,
  parseResultDoc: parseResultPdf,
  crawlActive,
  enrichActive: augmentActiveWithWadium,
  crawlDetailAreas,
};
