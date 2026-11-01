// Radzyń Podlaski adapter
//
// Gmina Miejska Radzyń Podlaski (powiat radzyński, lubelskie)

import { CONFIG } from './config.js';
import { crawlActive, crawlResultDocs, parseResultDoc } from './crawl.js';

export default {
  ...CONFIG,
  crawlActive,
  crawlResultDocs,
  parseResultDoc,
};
