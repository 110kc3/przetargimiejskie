import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Rawa Mazowiecka adapter (bip.net 7.32/Extranet hosted BIP; closest built
// analog for the overall shape: zgorzelec — server-HTML board-walk +
// inline-result, source:'html'). UNLIKE zgorzelec's two fixed board ids,
// rawa's announcement/result boards are year-partitioned and re-created every
// January, so crawl.js DISCOVERS the current year-board ids from the site's
// own menu on every run instead of hardcoding them. One memoised crawl serves
// both streams:
//   - crawlActive() → { listings, wykaz:[], land }. Flats/commercial units are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//     Sourced from the "Przetargi"/"Przetargi <year>" boards; leases (najem)
//     and non-sale notices are skipped.
//   - crawlResultDocs() → concluded "Informacja o wyniku" records (achieved
//     price / negative outcome) from the "Wyniki przetargów <year>" boards.
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//
// A single document can describe MULTIPLE flats (see parse.js's REAL DATA
// QUIRK #3 — the Reymonta lokale 1/4/5 notice), so both parseAnnouncement and
// parseResultDoc return an ARRAY of 0..N records; refresh.js already spreads
// parseResultDoc's return value (`allRecords.push(...recs)`), so N>1 is a
// safe, supported shape.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw
// HTML. `fallbackDate` is the metryka "Data publikacji" captured during the
// crawl — the body's own auction date wins whenever it parses.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
