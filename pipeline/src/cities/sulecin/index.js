// Sulęcin adapter — implements the registry contract (see ../index.js).
//
// Source: BIP at bip.sulecin.pl (SYSTEMDOBIP.PL / E-LINE) — a family of
// numeric "Lista informacji" boards (80 "current" + year-archives 481/2025,
// 461/2024, ...), each entry an HTML stub whose ogłoszenie AND (once
// concluded) wynik PDFs are BOTH attached to the same page:
//
//   crawlActive()     → { listings, wykaz:[], land }  (flat + land announcements)
//   crawlResultDocs() → result refs with .text already extracted (source:'html')
//   parseResultDoc()  → achieved price + outcome per flat/land plot
//
// See: spikes/lubuskie/powiat-sulecinski/sulecin.md

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
