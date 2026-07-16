// Włocławek city adapter — implements the registry contract (see ../index.js).
//
// Single source: the city BIP bip.wloclawek.eu Ogłoszenia o przetargach
// nieruchomości board (extranet "BIP w JST" CMS, the same platform as
// ../sepolno-krajenskie/). Inline HTML metadata + body prose drive listings; a
// result attachment (DOCX preferred, else PDF with an OCR fallback) supplies
// the achieved-price stream. See config.js for the full rationale.
//
//   crawlActive()      → { listings, wykaz: [], land: [] }
//   crawlResultDocs()  → Array<{ text, pdf_url, auction_date }>
//   parseResultDoc()   → Array<ResultRecord>   from "Informacja o wyniku/
//                        rozstrzygniętym przetargu" doc text

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
