import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Chełmno adapter (closest analog: Skarżysko-Kamienna — same Logonet CMS). One
// memoised crawl over the board XML feed serves both streams. UNLIKE Skarżysko,
// results are NOT separate "Informacja o wyniku" pages: each record carries an
// inline <rozstrzygniecie> resolution, so the split is by whether that element
// is filled (concluded) or empty (pending):
//   - crawlResultDocs() → concluded records (achieved price / negative outcome);
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/built properties are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw XML.
// `fallbackDate` is the data-przetargu auction date captured during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
