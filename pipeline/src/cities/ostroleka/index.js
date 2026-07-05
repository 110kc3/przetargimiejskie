import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Ostrołęka adapter (closest analog: Tarnowskie Góry — same Logonet BIP — but an
// OCR city like Gliwice: the announcement + result PDFs are scanned images).
//
// One memoised crawl over the city BIP's flat listings serves both streams:
//   - crawlResultDocs() → "Informacja o wyniku …" refs (the achieved-price
//     stream). config.source === 'pdf', so refresh.js OCRs each ref.pdf_url via
//     core/ocr-pdf.js and hands the text to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land:[] }. Flats with no result yet
//     are address-keyed active listings (→ properties.json/active.json); their
//     result notice, when published, joins by address (+ unit) in build-properties.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
