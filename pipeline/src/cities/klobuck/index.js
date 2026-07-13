import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Kłobuck adapter (gminaklobuck.pl bespoke PHP portal; ⚠️ Śląskie = public-tier,
// so crawl.js is bounded and never throws). One memoised walk of the paginated
// `/ogloszenia` board serves both streams; routing keys on the URL slug (the
// detail <h1> is a generic "Ogłoszenie"), and only sale-announcement + result
// pages are fetched:
//   - crawlActive() → { listings, wykaz:[], land }. Flats/units are address-keyed
//     (→ properties.json); undeveloped land (kind:'grunt') → land.json; only
//     upcoming (or dateless) auctions are returned as active.
//   - crawlResultDocs() → concluded "Informacja o wyniku …" records; source:'html'
//     ⇒ each ref carries a pre-built `.text` blob handed straight to parseResultDoc.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
