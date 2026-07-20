// Tomaszów Mazowiecki city adapter — implements the registry contract (see
// ../index.js). See config.js for the CMS/scope rationale and crawl.js for
// the board-walk + session-redirect fallback.
//
//   crawlActive()      → { listings, wykaz: [], land }  from the announcements
//                         board (?id=144386) + its per-item PDF attachments
//   crawlResultDocs()  → Array<{text, pdf_url, detail_url, auction_date}>
//                         from the results board (?id=148898)
//   parseResultDoc()   → Array<ResultRecord>            from the result PDF/DOCX text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
