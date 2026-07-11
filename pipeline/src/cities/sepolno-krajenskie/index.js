// Sępólno Krajeńskie city adapter — implements the registry contract (see ../index.js).
//
// Single source: the city BIP bip.gmina-sepolno.pl Przetargi board (extranet
// "BIP w JST" CMS). Inline HTML metadata drives listings; born-digital PDFs
// supply area + achieved prices. See config.js for the full rationale.
//
//   crawlActive()      → { listings, wykaz: [], land: [] }
//   crawlResultDocs()  → Array<{ text, pdf_url, auction_date }>
//   parseResultDoc()   → Array<ResultRecord>   from "Informacja o wyniku…" PDF text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
