// Pajęczno city adapter — implements the registry contract (see ../index.js).
//
// Single host: pajeczno.pl (Sulimo city-portal CMS, server-rendered HTML).
// See config.js for the full rationale and spike notes.
//
//   crawlActive()      → { listings, wykaz: [], land }  from the Sulimo board
//                         + detail pages (flats + Niwiska Dolne land parcels)
//   crawlResultDocs()  → Array<{text, auction_date, pdf_url, detail_url}>
//                         from the same board's "Informacja o wyniku
//                         przetargu" notices (inline text, or OCR'd PDF when
//                         the inline body is empty)
//   parseResultDoc()   → Array<ResultRecord>  land branch confirmed live
//                         (2022 OCR'd example); flat branch templated by
//                         analogy — see parse.js header for details

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
