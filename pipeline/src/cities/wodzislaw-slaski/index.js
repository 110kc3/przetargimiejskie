import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Wodzisław Śląski adapter.
//
// Gmina Miasto Wodzisław Śląski sells municipal flats, houses, and land
// via open oral auctions announced by Prezydent Miasta.
// Notices are published via FINN eUrząd (eurzad.finn.pl/gmwodzislawsl) embedded
// inside bip.wodzislaw-slaski.pl.
//
// The adapter directly connects to FINN eUrząd's JSON-RPC service:
//   - crawlResultDocs() -> results from register NWP
//   - parseResultDoc() -> extracts hammer price, buyer, outcome, date, round
//   - crawlActive() -> active listings (flats/houses) + land (działki) from IAG-Opost

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
