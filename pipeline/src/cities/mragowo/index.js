import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Mrągowo adapter (closest mechanical analog: Olsztyn — same Warmińsko-
// Mazurskie CNT BIP platform, NOT Braniewo; see config.js). One memoised
// crawl over kategoria 1050 (current + a bounded archive scan) serves both
// streams:
//   - crawlResultDocs() → "Informacja o (negatywnym) wyniku przetargu"
//     notices (the achieved-price stream); source:'html' means each ref
//     already carries `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/units are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json. A
//     result notice joins its announcement by address (+ flat-no) + round in
//     build-properties.
//
// Note: parseResultDoc receives `.text` (pre-extracted article body), not raw
// HTML.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
