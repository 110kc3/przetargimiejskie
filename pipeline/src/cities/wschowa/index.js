// Wschowa adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.gminawschowa.pl (SystemDoBIP/E-LINE — same engine as
// gorzow-wielkopolski and miedzyrzecz) — ONE board doubles as both the
// announcement AND the results engine:
//   Active:    /przetargi/29/status/0/  — crawlActive()     → { listings, wykaz:[], land }
//   Resolved:  /przetargi/29/status/1/  — crawlResultDocs() → result refs (flats only)
//   parseResultDoc()  → achieved price + outcome per flat
//
// See: spikes/lubuskie/powiat-wschowski/wschowa.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
