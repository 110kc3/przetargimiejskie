import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Pisz adapter (bip.pisz.hi.pl — hi.pl/PUBLIKATOR-style hosted BIP; first of
// its CMS family; closest built analog: Zgorzelec for the html/inline-result
// flow). One memoised crawl serves both streams from two query-string boards
// (current year k=84 + the single most-recent "Rok NNNN" archive):
//   - crawlActive() → { listings, wykaz, land }. Flats/commercial units are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json;
//     genuine pre-auction wykaz designations (address-keyed only — land
//     wykazy have no home in this contract and are dropped) → wykaz.
//     Lease/loan-for-use/exchange notices and BEZPRZETARGOWO (non-auction,
//     to-the-tenant or to-a-usufruct-holder) sale wykazy are skipped — see
//     parse.js header for the groundtruthed classification fixtures.
//   - crawlResultDocs() → concluded "wyniku przetargu"/"rozstrzygnięciu
//     przetargu" records (achieved price / negative outcome).
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw
// HTML. `fallbackDate` is the auction date captured during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
