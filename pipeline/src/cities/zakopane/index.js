// Zakopane adapter — bip.zakopane.eu (ESC S.A. / VelaBIP)
// Burmistrz Miasta Zakopane auctions municipal flats, residential buildings,
// and land plots directly via Wydział Mienia i Nadzoru Właścicielskiego.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
