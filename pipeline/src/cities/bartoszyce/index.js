// Bartoszyce adapter — implements the registry contract (see ADAPTER-GUIDE.md).
//
// Source: BIP at bip.bartoszyce.pl (SYSTEMDOBIP.PL / E-LINE) — board 160
// (active + archive) and board 158 (wykaz).
//
//   crawlActive()     → { listings, wykaz, land, valid_empty, valid_empty_land }
//   crawlResultDocs() → result refs with .text already extracted (source:'html')
//   parseResultDoc()  → achieved price + outcome per flat / land plot
//
// See spike: spikes/warminsko-mazurskie/powiat-bartoszycki/bartoszyce.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
