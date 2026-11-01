// Zamość city adapter registration
import { CONFIG } from './config.js';
import { crawlActive, crawlResults } from './crawl.js';

export const zamosc = {
  ...CONFIG,
  crawl: crawlActive,
  crawlActive,
  crawlResults,
};

export default zamosc;
