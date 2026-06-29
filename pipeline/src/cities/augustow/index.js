// Augustów city adapter — implements the registry contract (see ../index.js).
//
// Source: SmartSite BIP at bip.um.augustow.pl (server-rendered HTML,
// paginated, no JS wall, no auth). Two boards:
//   - ogloszenia-aktualne/  (active + recent results)
//   - ogloszenia-nieaktualne/ (archive, 19 pages as of 2026-06-29)
//
// Flat auction data:
//   - Active listings: titles carry round; address/area/price in detail body text.
//   - Result notices: "Informacja o wynikach…" on same board; achieved price in
//     a PDF attachment (/resource/<id>/<name>.pdf).
//
// Closest analogs: Kielce (SmartSite CMS) + Bytom (HTML result pattern).
// See spikes/podlaskie/powiat-augustowski/augustow.md for the spike verdict.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
