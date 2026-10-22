// Nidzica adapter — implements the registry contract (see ADAPTER-GUIDE.md).
//
// Source: BIP at bip.nidzica.pl (SystemDoBIP / E-LINE) —
//   - Module 257 (/przetargi/257/status/)
//   - Board 258 (/258/Ogloszenia_o_przetargach/)
//   - Board 259 (/259/Informacje_i_komunikaty/)
//
//   crawlActive()     → { listings, wykaz, land, valid_empty, valid_empty_land }
//   crawlResultDocs() → result refs with .text already extracted (source:'html')
//   parseResultDoc()  → achieved price + outcome per flat / land plot
//
// See spike: spikes/warminsko-mazurskie/powiat-nidzicki/nidzica.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
