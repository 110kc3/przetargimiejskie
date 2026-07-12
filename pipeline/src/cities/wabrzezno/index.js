import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Wąbrzeźno adapter (rbip.mojregion.info regional BIP — first of its CMS family;
// closest built analog: Zgorzelec for the html-board → article → inline-text flow
// and the two-pass announce/result split). One memoised crawl of the single
// "Przetargi" board (id 330, consumed via its XML feed) serves both streams:
//   - crawlActive() → { listings, wykaz:[], land }. Flats / commercial units are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json. A single
//     MULTI-LOKAL notice is split into one record per flat. Call-for-tenders,
//     rokowania and leases (dzierżawa/najem) are skipped.
//   - crawlResultDocs() → concluded "Informacja o wynikach/dotycząca …" records
//     (achieved price / negative outcome). source:'html' ⇒ each ref carries the
//     pre-built `.text` blob (inline HTML, or born-digital PDF/DOCX text), which
//     refresh.js hands straight to parseResultDoc.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw HTML.
// `fallbackDate` is the auction date captured during the crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
