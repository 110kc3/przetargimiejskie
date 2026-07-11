// Bolesławiec city adapter — implements the registry contract (see ../index.js).
//
// Source: TWO surfaces (see config.js/crawl.js). Announcements + wykaz come from
// the city portal's Joomla RSS feeds (server-rendered, no Playwright); results
// come from the city BIP's "Wyniki sprzedaży nieruchomości" board as
// born-digital PDFs.
//
//   crawlActive()      → { listings, wykaz, land }
//   crawlResultDocs()  → refs { text, pdf_url, auction_date }  (source:'html')
//   parseResultDoc()   → achieved-price / negative-outcome record(s)
//
// See: spikes/dolnoslaskie/powiat-boleslawiecki/boleslawiec.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
