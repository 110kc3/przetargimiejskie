// Rybnik city adapter — implements the registry contract (see ../index.js).
//
// Active-listings adapter: ZGM Rybnik's "Ogłoszenie o przetargach" page (+ its
// archive batches) is crawled, each flat auction's RTF announcement parsed into
// one active listing. No results stream wired, so crawlResultDocs() is [] and
// parseResultDoc() is a stub. See crawl.js / config.js.

import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
