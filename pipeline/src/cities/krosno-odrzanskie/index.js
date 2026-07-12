// Krosno Odrzańskie adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.krosnoodrzanskie.pl (SYSTEMDOBIP.PL / E-LINE — same engine
// as wschowa / strzelce-krajenskie / gorzow-wielkopolski / miedzyrzecz) — ONE
// board doubles as both the announcement AND the results engine:
//   Active:   /przetargi/202/status/0/  — crawlActive()     → { listings, wykaz:[], land:[] }
//   Resolved: /przetargi/202/status/1/  — crawlResultDocs() → result refs (flats only)
//   parseResultDoc()  → achieved price + outcome per flat
//
// FLATS-ONLY scope (residential lokal mieszkalny). See config.js / parse.js.
//
// See: spikes/lubuskie/powiat-krosnienski/krosno-odrzanskie.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
