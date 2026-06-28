import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Świnoujście adapter (closest analog: Tarnowskie Góry / Stargard, same
// Logonet 2.9.0 CMS). Single crawl over two boards:
//   artykuly/1717 — active flat/house auctions (TBS Lokum)
//   artykuly/1718 — archive of past announcements (same publisher)
//
// Both streams are plain HTML article lists. No result notices are published,
// so crawlResultDocs() returns [] and parseResultDoc() always returns [].
// DOC attachments (2026 announcements) are enriched for starting price via
// catdoc; scanned-PDF attachments (older) are skipped — price stays null.
//
// source: 'html' — tells refresh.js not to dispatch OCR/pdf-text; the adapter
// owns its own attachment handling.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
