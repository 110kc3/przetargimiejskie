import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Lubin adapter (Logonet CMS — same vendor as jelenia-gora, a newer install
// with a different, feed-less URL shape; see config.js/crawl.js). One
// memoised crawl over three boards serves all three streams:
//   - crawlActive() → { listings, wykaz, land }. Flats/commercial are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json;
//     wykaz are pre-auction designations with no date/price yet.
//   - crawlResultDocs() → "Informacja o wyniku przetargu" notices (the
//     achieved-price stream — UNVALIDATED against a real Lubin document, see
//     parse.js header); source:'html' means each ref already carries `.text`,
//     which refresh.js hands to parseResultDoc.
//
// See crawl.js for the live-verified board URL shapes and the short-retention
// finding (both the announcements and results boards are currently empty —
// concluded/expired items age out of the board and the sitemap).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
