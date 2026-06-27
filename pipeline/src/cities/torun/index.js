// Toruń city adapter — implements the registry contract (see ../index.js).
//
//   crawlActive()       → { listings, wykaz:[] }  from the BIP XML export
//   crawlResultDocs()   → [ { text, pdf_url, auction_date } ]  DOCX result notices
//   parseResultDoc()    → concluded auction records (achieved price + outcome)

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
