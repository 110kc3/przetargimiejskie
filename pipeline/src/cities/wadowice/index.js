// Wadowice adapter
//
// Gmina Wadowice (powiat wadowicki, małopolskie)

import { CONFIG } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  ...CONFIG,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
