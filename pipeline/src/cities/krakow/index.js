import { config } from './config.js';
import { crawlActive, crawlResultDocs } from './crawl.js';
import { parseResultDoc } from './parse.js';

// Kraków adapter (bespoke bip.krakow.pl). One memoised crawl over the
// announcement + result boards serves both streams; each article is a
// MULTI-PROPERTY notice, so one result ref yields several concluded records via
// parseResultDoc. source:'html' ⇒ result refs already carry `.text`.

export default {
  ...config,
  crawlResultDocs,
  parseResultDoc,
  crawlActive,
};
