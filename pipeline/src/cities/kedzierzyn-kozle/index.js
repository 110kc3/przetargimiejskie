import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Kędzierzyn-Koźle adapter (closest analog: Tarnowskie Góry — same Logonet CMS).
// One memoised crawl over the board-85 master tables serves both streams:
//   - crawlResultDocs() → "Informacja o wyniku przetargu" notices (the
//     achieved-price stream); source:'html' means each ref already carries
//     `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/commercial are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json. Result
//     notices join their announcement by address (+ unit) + round in
//     build-properties.
//
// The dual text/skan PDF pattern is handled in crawl.js (the scanned twin is
// dropped); the non-skan born-digital PDF carries all the detail the parsers need.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
