// Wejherowo city adapter — implements the registry contract (see ../index.js).
//
// Source: bip.wejherowo.pl — server-rendered BIP, annual sub-pages
//   /artykul/przetargi-YYYY-r, article body HTML, result PDFs.
//
// Bot-block: bip.wejherowo.pl gates the default bot UA; all fetches use
// BROWSER_UA (set in crawl.js). Chrome MCP scraped it cleanly in the spike.
//
// crawlActive()     → { listings, wykaz:[], land:[] }   active flat auctions
// crawlResultDocs() → refs[]  resolved articles → result PDF URLs
// parseResultDoc()  → []|[record]  achieved price from PDF text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
