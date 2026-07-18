// Płock adapter — implements the registry contract (see ../index.js).
//
// ARS Sp. z o.o. (Agencja Rewitalizacji Starówki) runs the city's open flat/
// building sale auctions on its own server-rendered HTML site (ars.plock.pl);
// see config.js + crawl.js for the full rationale.
//
//   crawlActive()      → { listings, wykaz:[] } from the "Ogłoszenia o
//                         przetargach" board (address-keyed: flats, and whole
//                         part-residential buildings as kind 'zabudowana';
//                         raw land is out of scope for this host/company).
//   crawlResultDocs()  → "Wyniki przetargów" board notices; source:'html' ⇒
//                         each ref already carries `.text` (title + body +
//                         pdfText/ocrPdf), which refresh.js hands to
//                         parseResultDoc.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
