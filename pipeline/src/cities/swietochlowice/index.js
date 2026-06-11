// Świętochłowice city adapter — implements the registry contract (see ../index.js).
//
// Adapter over the city BIP's flats-only auction category
// (www.bip.swietochlowice.pl/bipkod/29287911, Liferay). One memoised page walk
// feeds both streams: crawlActive harvests announcements (address + round from
// the title, price/area/date from the .doc via catdoc), and crawlResultDocs
// routes the board's "Informacja o wyniku …" PDFs to parseResultDoc — the
// achieved-price stream. See crawl.js / parse.js / config.js.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
