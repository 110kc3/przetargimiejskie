import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Skarżysko-Kamienna adapter (closest analog: Kędzierzyn-Koźle — same Logonet
// CMS). One memoised crawl over the paginated listing board serves both streams:
//   - crawlResultDocs() → "Informacja o wyniku przetargu" notices (the
//     achieved-price stream); source:'html' means each ref already carries
//     `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/built properties are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//
// Note: parseResultDoc receives `.text` (pre-extracted body text), not raw HTML.
// The `fallbackDate` argument is the structured-table auction date captured
// during the crawl (already in the text, but passed as a convenience).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
