// Busko-Zdrój city adapter — implements the registry contract (see ../index.js).
//
// Single host (umig.busko.pl): auction announcements are HTML articles on the
// /ogloszenia feed; result "Informacja o wynikach przetargu" notices are text
// PDFs on dl.umig.busko.pl linked from the same article. See config.js.
//
//   crawlActive()      → { listings, land, wykaz: [] } from HTML/text PDF announcements
//   crawlResultDocs()  → Array<{text, pdf_url, auction_date}> from result PDFs
//   parseResultDoc()   → Array<ResultRecord>         from result PDF text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
