// Gorzów Wielkopolski adapter — implements the registry contract (see ../index.js).
// Rebuilt + live-groundtruthed 2026-07-06 (the 2026-06-27 build was corrupted
// by a sandbox mount-sync).
//
// Source: BIP at bip.um.gorzow.pl — two boards:
//   1. Announcements: /przetargi/320/status/{0,1}/       — batch PDF per round (4-12 flats)
//   2. Results:       /509/ + /509/1/archiwum/…/{page}/  — one PDF per result notice
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
