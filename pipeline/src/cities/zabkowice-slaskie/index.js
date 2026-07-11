import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Ząbkowice Śląskie adapter (closest analog: Tarnowskie Góry / Kędzierzyn-Koźle —
// same Logonet eUrząd CMS, but Ząbkowice's dedicated real-estate module means the
// crawler drives the status-filterable estate search + reads each notice's inline
// "Szczegóły" HTML table rather than the generic-article JSON API / master tables).
//
//   - crawlActive() → { listings, wykaz:[], land }. Announcements are parsed
//     straight from server HTML (no PDF): flats/commercial/garages are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//   - crawlResultDocs() → "INFORMACJA O WYNIKU PRZETARGU" notices. These are
//     SCANNED PDFs, so crawl.js OCRs them itself (core/ocr-pdf.js); source:'html'
//     means each ref already carries `.text`, which refresh.js hands to
//     parseResultDoc. A result joins its announcement by address key (flats) /
//     parcel key (land) + round in build-properties / build-land.
//
// The result body shares the announcement's Polish prose, so parse.js reuses one
// set of address/parcel/kind/area extractors across both streams (see parse.js).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
