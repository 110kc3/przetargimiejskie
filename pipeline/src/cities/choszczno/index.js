import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Choszczno adapter (closest analog: chełmno's blob-parser architecture,
// adapted from chełmno's clean XML feed to a year-tree HTML walk + PDF-
// attachment extraction — see config.js / crawl.js / parse.js headers). One
// memoised crawl over the year tree serves both streams:
//   - crawlActive()      → { listings, wykaz:[], land }. Flats/houses are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//     wykaz is always empty here — Choszczno's separate "Wykazy" sub-board
//     was not investigated (out of scope, see config.js).
//   - crawlResultDocs()  → concluded cases (achieved price / negative
//     outcome); source:'html' ⇒ each ref carries the pre-built `.text` blob
//     (buildRecordText), which refresh.js hands to parseResultDoc.
//
// A case (article) is concluded once its "informacja…pdf" result attachment
// appears — present for both sold and unsold outcomes — vs. pending when only
// the "ogloszenie…pdf" announcement attachment exists.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
