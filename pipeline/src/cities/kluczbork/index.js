import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Kluczbork adapter (bip.net v7.33 Extranet; closest analogs: rawa-mazowiecka, golub-dobrzyn).
// Sells municipal flats and land plots via ustny przetarg nieograniczony on bip.kluczbork.eu:
//   - Announcements (board 452): crawlActive() → { listings, wykaz:[], land, valid_empty, valid_empty_land }
//   - Results (board 690): crawlResultDocs() → concluded "Informacja o wyniku przetargu..." records
//     source:'html' ⇒ each ref carries `.text` (extracted via pdfText from the attached result PDF),
//     which refresh.js hands directly to parseResultDoc.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
