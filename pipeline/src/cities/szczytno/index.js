// Szczytno city adapter — implements the registry contract (see ADAPTER-GUIDE.md).
//
// Source: Vendor server-rendered CMS (Bootstrap + DataTables) at bip.um.szczytno.pl
//
//   crawlActive()      → { listings, wykaz, land, valid_empty, valid_empty_land }
//   crawlResultDocs()  → refs { text, pdf_url, auction_date } (source: 'html')
//   parseResultDoc()   → achieved-price / negative-outcome record(s)
//
// See: spikes/warminsko-mazurskie/powiat-szczycienski/szczytno.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
