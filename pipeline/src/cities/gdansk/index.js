import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Gdańsk adapter (bip.gdansk.pl, Wydział Skarbu). Server-rendered HTML index
// → born-digital PDF per auction batch → parsed for property records.
// source:'html' ⇒ crawlResultDocs refs already carry .text (when wired up).
// Result stream stub: crawlResultDocs() returns [] until the result-notice
// section URL is confirmed on the first post-auction CI run (2026-07-01+).

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
