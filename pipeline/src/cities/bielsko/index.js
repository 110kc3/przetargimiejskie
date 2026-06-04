// Bielsko-Biała city adapter — implements the registry contract (see ../index.js).
//
// Active-listings adapter over the city's server-rendered Giełda Nieruchomości
// (Drupal). crawlActive walks the giełda index, follows each `/nieruchomosc/`
// node, classifies by `Rodzaj nieruchomości` and emits one active listing per
// flat. No sold-price stream exists, so crawlResultDocs() is [] and
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
