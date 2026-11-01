// Parczew city adapter registration
import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const parczew = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default parczew;
