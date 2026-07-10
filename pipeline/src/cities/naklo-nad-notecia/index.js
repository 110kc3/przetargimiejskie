import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Nakło nad Notecią adapter (closest analog: Chełmno — same Logonet CMS + URL
// scheme). One memoised crawl over the board XML feed serves both streams.
// UNLIKE Chełmno, results are NOT inline on the record XML: crawl.js finds a
// separate "Informacja o wyniku ..." attachment per concluded record, fetches
// + extracts it (pdfText, falling back to docText for the mixed .docx
// notices), and folds the text into the blob as WYNIK — the split is by
// whether that came back non-empty (concluded) or the attachment was simply
// absent (pending):
//   - crawlResultDocs() → concluded records (achieved price / negative outcome);
//     source:'html' ⇒ each ref carries the pre-built `.text` blob, which
//     refresh.js hands to parseResultDoc.
//   - crawlActive() → { listings, wykaz:[], land }. Flats/built properties are
//     address-keyed (→ properties.json); land (kind:'grunt') → land.json.
//
// Note: parseResultDoc receives `.text` (the buildRecordText blob), not raw
// XML. `fallbackDate` is the data-przetargu auction date captured during the
// crawl.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
