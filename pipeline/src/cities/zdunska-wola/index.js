import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Zduńska Wola adapter (closest analog: Chełmno / Nakło nad Notecią — same
// Logonet CMS + clean XML feed; broader shape also mirrors tarnowskie-gory).
// One memoised crawl over the board XML feed serves both streams:
//   - crawlResultDocs() → concluded records (non-empty <rozstrzygniecie> —
//     the achieved-price + buyer stream, INLINE on the same record, no
//     separate "Informacja o wyniku" page); source:'html' ⇒ each ref carries
//     the pre-built `.text` blob, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats are address-keyed
//     (→ properties.json); land (kind:'grunt') → land.json.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw
// XML. `fallbackDate` is the data-przetargu auction date captured during the
// crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
