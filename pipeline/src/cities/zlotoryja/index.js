import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Złotoryja adapter (bip.zlotoryja.pl — a modern Angular SPA backed by a
// JSON:API-shaped REST API; NOT the dead legacy bip.info.pl host the spike
// profiled — see crawl.js header for the full source-correction story). One
// memoised crawl serves both streams from two API categories:
//   - crawlActive() → { listings, wykaz:[], land }. Flats are address-keyed
//     (→ properties.json); land (kind:'grunt') → land.json. Sourced from the
//     "Przetargi" category (id "przedmiotowe74").
//   - crawlResultDocs() → concluded "Informacja o wyniku przetargu" records
//     (achieved price / negative outcome), sourced from the general
//     "Ogłoszenia" category (id "przedmiotowe5") filtered to "wyniku"
//     titles and gated through isResultDoc/isSaleAuction/isLease in parse.js.
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw
// HTML/JSON. `fallbackDate` is the auction date captured during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
