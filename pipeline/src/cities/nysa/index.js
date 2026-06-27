import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Nysa adapter (closest analog: Tarnowskie Góry). One memoised crawl over both
// boards (c=280 active, c=318 archive) serves both streams:
//   - crawlResultDocs() → "Informacja o wyniku przetargu" PDFs (achieved-price
//     stream); source:'html' means each ref already carries `.text`, which
//     refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land:[] }. Flats are address-keyed
//     (→ properties.json). No land/grunt records for this adapter (Nysa flat
//     auctions only). Result notices join announcements by address key + round
//     in build-properties.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
