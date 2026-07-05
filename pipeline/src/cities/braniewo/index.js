import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Braniewo adapter (closest analog: Tarnowskie Góry — same Logonet CMS vendor,
// older server-rendered variant). One memoised crawl over board 120 serves both
// streams:
//   - crawlResultDocs() → "Informację o wyniku … przetargu" notices (the
//     achieved-price stream); source:'html' means each ref already carries
//     `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/units are address-keyed
//     (→ properties.json); land (kind:'grunt') → land.json. A result notice joins
//     its announcement by address (+ flat-no) + round in build-properties.
//
// Note: parseResultDoc receives `.text` (pre-extracted PDF body), not raw HTML.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
