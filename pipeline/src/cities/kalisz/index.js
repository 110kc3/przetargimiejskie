import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Kalisz adapter (classic PHP-templated bip.kalisz.pl WGM board, r_ogl=SN).
// crawlActive() and crawlResultDocs() share one memoized board+PDF crawl
// (crawl.js): every entry's PDF is fetched and classified from its own text
// (announcement vs result vs land/lease — the board's title can be stale,
// see crawl.js header). source:'html' ⇒ result refs already carry `.text`.

export default {
  ...config,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
