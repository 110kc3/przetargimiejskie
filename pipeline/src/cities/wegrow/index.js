import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Węgrów adapter (Logonet eUrząd 2.9.0 — closest analogs tarnowskie-gory /
// naklo-nad-notecia / chelmno, but a THIRD live shape: a generic Logonet
// article board XML feed, not either analog's JSON API or dedicated
// real-estate-tender XML module — see config.js + crawl.js). One memoised
// crawl over board 345 ("Ogłoszenia sprzedaży") serves both streams:
//   - crawlResultDocs() -> concluded records (achieved price / negative
//     outcome); source:'html' => each ref carries the pre-built `.text` blob,
//     which refresh.js hands to parseResultDoc.
//   - crawlActive() -> { listings, wykaz:[], land }. Flats/houses are
//     address-keyed (-> properties.json); land (kind:'grunt') -> land.json.
//     wykaz is always empty — every wykaz (bezprzetargowo tenant sale AND
//     pre-przetarg designation alike) is skipped by title before ever being
//     fetched; see crawl.js header for why.
//
// parseResultDoc receives `.text` (the buildRecordText blob), not raw HTML/
// PDF bytes. `fallbackDate` is the article's XML publish date captured
// during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
