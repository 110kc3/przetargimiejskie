import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Trzebnica adapter (closest LIVE-VERIFIED analog: naklo-nad-notecia — same
// Logonet eUrząd v2.9.0 XML-feed CMS; see crawl.js/parse.js for the corrected
// clone lineage vs. the dispatch brief's suggested tarnowskie-gory). One
// memoised crawl over the board XML feed serves both streams:
//   - crawlResultDocs() → the (very sparse — see parse.js) body-confirmed
//     "INFORMACJA O WYNIKU PRZETARGU" records; source:'html' means each ref
//     already carries `.text`, which refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/built/commercial
//     units are address-keyed (→ properties.json); land (kind:'grunt') is
//     returned via `land` and refresh.js writes it to land.json. wykaz stays
//     empty — trzebnica's "Wykazy nieruchomości" board (article 41) isn't
//     wired up (same scope as tarnowskie-gory/naklo).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
