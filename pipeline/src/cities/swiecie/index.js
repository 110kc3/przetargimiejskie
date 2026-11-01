// Świecie adapter
//
// Gmina Świecie (powiat świecki, kujawsko-pomorskie)

import { CONFIG } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  ...CONFIG,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
