import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Jelenia Góra adapter (Logonet CMS — closest analogs: Kędzierzyn-Koźle /
// Tarnowskie Góry / Skarżysko-Kamienna). One memoised crawl over the two
// XML-fed boards (126 announcements, 321 results) serves both streams:
//   - crawlResultDocs() → "Informacja o wyniku przetargu" notices (the
//     achieved-price stream); source:'html' means each ref already carries
//     `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/commercial are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//     Result notices join their announcement by address (+ unit) + round in
//     build-properties.
//
// See crawl.js for the live-verified XML-feed enumeration quirk and the
// result-board retention finding (old result articles get deleted from the
// CMS after a few weeks — see the header comment there).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
