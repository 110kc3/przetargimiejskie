// Gorzów Wielkopolski adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.um.gorzow.pl — two boards:
//   1. Announcements: /przetargi/320/status/  — batch PDF per round (8-15 flats)
//   2. Results:       /509/1/archiwum/…/      — batch PDF per result notice
//
//   crawlActive()     → { listings, wykaz:[], land:[] }  (flat auction announcements)
//   crawlResultDocs() → result refs with .text already extracted (source:'html')
//   parseResultDoc()  → achieved price + outcome per flat
//
// See: spikes/lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
