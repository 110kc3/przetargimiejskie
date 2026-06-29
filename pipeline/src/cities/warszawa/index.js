// Warszawa city adapter — implements the registry contract (see ../index.js).
//
// Source: ETO (Elektroniczna Tablica Ogłoszeń) at eto.um.warszawa.pl,
// category 165 "Wykup lokalu, przetargi" — the city-wide flat-auction board
// aggregating all 18 dzielnice + AMW (Agencja Mienia Wojskowego).
//
// District topology: ETO IS the central aggregator. All dzielnica flat-sale
// auctions are cross-posted to ETO within their publication window. Confirmed
// 2026-06-29 — see config.js header for full evidence.
//
// crawlResultDocs() → result notice refs with .text set (short windows; daily CI)
// parseResultDoc()  → achieved price from result notice text
// crawlActive()     → { listings, wykaz:[] } from ETO list + dzielnica detail fetch

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
