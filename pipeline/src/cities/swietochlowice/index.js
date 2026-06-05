// Świętochłowice city adapter — implements the registry contract (see ../index.js).
//
// Active-listings adapter over the city BIP's flats-only auction category
// (www.bip.swietochlowice.pl/bipkod/29287911, Liferay). crawlActive harvests each
// announcement, taking address + round from the title and price/area/date from
// the .doc body (catdoc). No sold-price stream → crawlResultDocs() is [] and
// parseResultDoc() is a stub. See crawl.js / parse.js / config.js.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
