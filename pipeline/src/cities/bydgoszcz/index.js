import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Bydgoszcz adapter — Logonet BIP, board 1208, DOCX result notices.
//
// Single memoised crawl over the flat-auction board (artykuly/1208) serves both
// streams:
//   - crawlResultDocs() → "Informacja o wyniku przetargu" DOCX result notices;
//     source:'html' means each ref already carries .text, handed to parseResultDoc
//     by refresh.js.
//   - crawlActive() → { listings, wykaz:[], land:[] }.  Flat announcements only;
//     land/buildings filtered out here (result notices from land auctions are
//     included in crawlResultDocs for logging but parseResultDoc returns [] for
//     grunt kind, so they don't pollute properties.json).
//
// The DOCX result attachment is the authoritative source for the achieved price —
// the HTML body never carries it. doc-text.js handles both legacy .doc (catdoc)
// and OOXML .docx (unzip word/document.xml) transparently.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
