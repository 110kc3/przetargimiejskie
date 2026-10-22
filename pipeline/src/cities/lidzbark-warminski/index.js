// Lidzbark Warmiński adapter — implements the registry contract (see ../ADAPTER-GUIDE.md).
//
// Source: BIP at bip.lidzbarkw.pl (SYSTEMDOBIP.PL / E-LINE)
//   Active:   /przetargi/10054/status/0/  — crawlActive()     → { listings, wykaz:[], land:[], valid_empty, valid_empty_land }
//   Resolved: /przetargi/10054/status/1/  — crawlResultDocs() → result refs (flats only)
//   parseResultDoc()  → achieved price + outcome per flat
//
// FLATS-ONLY scope (residential lokal mieszkalny).
// See: spikes/warminsko-mazurskie/powiat-lidzbarski/lidzbark-warminski.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export { config, crawlActive, crawlResultDocs, parseResultDoc };

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
