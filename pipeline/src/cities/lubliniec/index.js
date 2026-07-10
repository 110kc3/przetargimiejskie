import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Lubliniec adapter (bip.info.pl hosted BIP — same CMS family as Zgorzelec,
// this adapter's template; closest built analogs: Zgorzelec for the
// html/inline-result flow + two-board split, Chełmno for the general
// html/inline-result architecture). One memoised crawl serves both streams
// from two dedicated boards:
//   - crawlActive() → { listings, wykaz:[], land }. Flats / commercial units /
//     garages are address-keyed (→ properties.json); land (kind:'grunt') →
//     land.json. Sourced from the "Ogłoszenia o przetargach" board (idmp=93);
//     leases, cancellations and complaint-resolution notices are skipped.
//   - crawlResultDocs() → concluded "wynik przetargu" records (achieved price
//     / negative outcome) from the "Wyniki przetargów" board (idmp=94).
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//
// Both boards are bounded to the most recent items per run (see crawl.js's
// header) — the archive goes back to 2008, far deeper than any single CI run
// should walk.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw HTML.
// `fallbackDate` is the auction date captured during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
