import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Zgorzelec adapter (bip.info.pl hosted BIP — first of its CMS family; closest
// built analogs: Chełmno for the html/inline-result flow, Legnica for the
// board-walk). One memoised crawl serves both streams from two dedicated boards:
//   - crawlActive() → { listings, wykaz:[], land }. Flats / commercial units are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json. Sourced
//     from the "Ogłoszenia o przetargu" board (idmp=32); call-for-tenders / works
//     contracts and leases are skipped.
//   - crawlResultDocs() → concluded "Informacja o wyniku" records (achieved price
//     / negative outcome) from the "Rozstrzygnięcia" board (idmp=34).
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw HTML.
// `fallbackDate` is the auction date captured during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
