import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Gostyń adapter (closest analog: Tarnowskie Góry — same Logonet eUrząd CMS
// family). One memoised crawl over the property board(s) serves both streams:
//   - crawlResultDocs() → "INFORMACJA o wyniku …" result notices (the
//     achieved-price stream). source:'html' means each ref already carries
//     `.text` (docx via docText / scanned pdf via ocrPdf), which refresh.js
//     hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/buildings are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//     Result notices join their announcement by address (flats) or dzialka_nr +
//     locality (land) in build-properties.
//
// Both the announcement (.docx) and result (.pdf) documents are MULTI-PROPERTY
// (Gostyń groups the działki/flats of one auction session per file), so
// parseAnnouncement / parseResultDoc return one record per property — see parse.js.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
