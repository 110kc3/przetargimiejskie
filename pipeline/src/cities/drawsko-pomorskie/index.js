// Drawsko Pomorskie city adapter — implements the registry contract (see
// ../index.js). Single HTML source (drawsko.pl news board); JSON-LD articleBody
// is the text. See config.js for the full rationale.
//
//   crawlActive()      → { listings, wykaz: [], land: [] }   announcements
//   crawlResultDocs()  → Array<{ text, auction_date, pdf_url }>  result notices
//   parseResultDoc()   → Array<ResultRecord>   from a decoded result articleBody

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
